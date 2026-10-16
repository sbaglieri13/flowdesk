from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Protocol
from urllib.parse import quote

import httpx

from backend.app.config import Settings, settings


class StorageError(RuntimeError):
    pass


class ObjectNotFound(StorageError):
    pass


@dataclass(frozen=True)
class StoredObject:
    key: str
    size_bytes: int
    created_at: datetime


class Storage(Protocol):
    def put(self, bucket: str, key: str, data: bytes, content_type: str | None = None) -> None: ...

    def get(self, bucket: str, key: str) -> bytes: ...

    def delete(self, bucket: str, keys: list[str]) -> None: ...

    def list(self, bucket: str) -> list[StoredObject]: ...


def _safe_key(key: str) -> str:
    if not key or "/" in key or "\\" in key or key in {".", ".."}:
        raise StorageError(f"Invalid object key: {key!r}")
    return key


class LocalStorage:
    def __init__(self, root: Path) -> None:
        self.root = root

    def _path(self, bucket: str, key: str) -> Path:
        return self.root / _safe_key(bucket) / _safe_key(key)

    def put(self, bucket: str, key: str, data: bytes, content_type: str | None = None) -> None:  # noqa: ARG002
        path = self._path(bucket, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def get(self, bucket: str, key: str) -> bytes:
        path = self._path(bucket, key)
        if not path.is_file():
            raise ObjectNotFound(key)
        return path.read_bytes()

    def delete(self, bucket: str, keys: list[str]) -> None:
        for key in keys:
            self._path(bucket, key).unlink(missing_ok=True)

    def list(self, bucket: str) -> list[StoredObject]:
        folder = self.root / _safe_key(bucket)
        if not folder.is_dir():
            return []
        return [
            StoredObject(
                key=path.name,
                size_bytes=path.stat().st_size,
                created_at=datetime.fromtimestamp(path.stat().st_mtime, UTC),
            )
            for path in folder.iterdir()
            if path.is_file()
        ]


class SupabaseStorage:
    LIST_PAGE_SIZE = 1000

    def __init__(self, base_url: str, service_role_key: str, client: httpx.Client | None = None) -> None:
        self.base_url = f"{base_url.rstrip('/')}/storage/v1"
        self.client = client or httpx.Client(timeout=60)
        self.headers = {"apikey": service_role_key}
        if service_role_key.startswith("eyJ"):
            self.headers["Authorization"] = f"Bearer {service_role_key}"

    def _object_url(self, bucket: str, key: str, authenticated: bool = False) -> str:
        scope = "object/authenticated" if authenticated else "object"
        return f"{self.base_url}/{scope}/{quote(_safe_key(bucket))}/{quote(_safe_key(key))}"

    @staticmethod
    def _is_not_found(response: httpx.Response) -> bool:
        if response.status_code == 404:
            return True
        if response.status_code == 400:
            try:
                body = response.json()
            except ValueError:
                return False
            return str(body.get("statusCode")) == "404" or body.get("error") == "not_found"
        return False

    def _request(self, method: str, url: str, **kwargs) -> httpx.Response:
        headers = {**self.headers, **kwargs.pop("headers", {})}
        try:
            response = self.client.request(method, url, headers=headers, **kwargs)
        except httpx.HTTPError as exc:
            raise StorageError(f"Could not reach Supabase Storage: {exc}") from exc
        return response

    @staticmethod
    def _raise_for_status(response: httpx.Response, action: str) -> None:
        if response.is_success:
            return
        try:
            detail = response.json().get("message") or response.text
        except ValueError:
            detail = response.text
        raise StorageError(f"Supabase Storage {action} failed ({response.status_code}): {detail}")

    def put(self, bucket: str, key: str, data: bytes, content_type: str | None = None) -> None:
        response = self._request(
            "POST",
            self._object_url(bucket, key),
            content=data,
            headers={"Content-Type": content_type or "application/octet-stream", "x-upsert": "true"},
        )
        self._raise_for_status(response, "upload")

    def get(self, bucket: str, key: str) -> bytes:
        response = self._request("GET", self._object_url(bucket, key, authenticated=True))
        if self._is_not_found(response):
            raise ObjectNotFound(key)
        self._raise_for_status(response, "download")
        return response.content

    def delete(self, bucket: str, keys: list[str]) -> None:
        if not keys:
            return
        response = self._request(
            "DELETE",
            f"{self.base_url}/object/{quote(_safe_key(bucket))}",
            json={"prefixes": [_safe_key(key) for key in keys]},
        )
        self._raise_for_status(response, "delete")

    def list(self, bucket: str) -> list[StoredObject]:
        objects: list[StoredObject] = []
        offset = 0
        while True:
            response = self._request(
                "POST",
                f"{self.base_url}/object/list/{quote(_safe_key(bucket))}",
                json={"prefix": "", "limit": self.LIST_PAGE_SIZE, "offset": offset},
            )
            self._raise_for_status(response, "list")
            page = response.json()
            for item in page:
                if item.get("id") is None:
                    continue
                created = item.get("created_at") or item.get("updated_at")
                objects.append(
                    StoredObject(
                        key=item["name"],
                        size_bytes=int((item.get("metadata") or {}).get("size") or 0),
                        created_at=_parse_timestamp(created),
                    )
                )
            if len(page) < self.LIST_PAGE_SIZE:
                return objects
            offset += self.LIST_PAGE_SIZE


def _parse_timestamp(value: str | None) -> datetime:
    if not value:
        return datetime.now(UTC)
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.astimezone(UTC) if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def build_storage(config: Settings) -> Storage:
    if config.storage_backend == "local":
        assert config.local_storage_dir is not None
        return LocalStorage(config.local_storage_dir)
    return SupabaseStorage(config.supabase_url, config.supabase_service_role_key)


@lru_cache(maxsize=1)
def get_storage() -> Storage:
    return build_storage(settings)
