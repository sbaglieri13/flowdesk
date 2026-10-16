import io
import json
from datetime import UTC, datetime

import httpx
import pytest

from backend.app.config import load_settings
from backend.app.services import storage_service
from backend.app.services.storage_service import (
    LocalStorage,
    ObjectNotFound,
    StorageError,
    SupabaseStorage,
    build_storage,
)

BASE = "https://project.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiJ9.legacy-service-role"


def _storage(handler) -> tuple[SupabaseStorage, list[httpx.Request]]:
    seen: list[httpx.Request] = []

    def record(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return handler(request)

    client = httpx.Client(transport=httpx.MockTransport(record))
    return SupabaseStorage(BASE + "/", KEY, client=client), seen


def test_put_uploads_with_service_key_and_upsert():
    storage, seen = _storage(lambda _r: httpx.Response(200, json={"Key": "attachments/a.txt"}))

    storage.put("attachments", "a b.txt", b"data", "text/plain")

    request = seen[0]
    assert request.method == "POST"
    assert str(request.url) == f"{BASE}/storage/v1/object/attachments/a%20b.txt"
    assert request.headers["authorization"] == f"Bearer {KEY}"
    assert request.headers["apikey"] == KEY
    assert request.headers["content-type"] == "text/plain"
    assert request.headers["x-upsert"] == "true"
    assert request.content == b"data"


def test_put_defaults_to_octet_stream():
    storage, seen = _storage(lambda _r: httpx.Response(200, json={}))
    storage.put("attachments", "blob", b"x")
    assert seen[0].headers["content-type"] == "application/octet-stream"


def test_get_reads_from_the_authenticated_endpoint():
    storage, seen = _storage(lambda _r: httpx.Response(200, content=b"bytes"))

    assert storage.get("attachments", "a.txt") == b"bytes"
    assert str(seen[0].url) == f"{BASE}/storage/v1/object/authenticated/attachments/a.txt"


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(404, json={"message": "Not found"}),
        httpx.Response(400, json={"statusCode": "404", "error": "not_found", "message": "Object not found"}),
        httpx.Response(400, json={"error": "not_found"}),
    ],
)
def test_get_maps_both_not_found_shapes(response):
    storage, _ = _storage(lambda _r: response)
    with pytest.raises(ObjectNotFound):
        storage.get("attachments", "missing.txt")


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(400, json={"statusCode": "403", "message": "denied"}),
        httpx.Response(400, text="plain"),
        httpx.Response(500, text="boom"),
    ],
)
def test_other_errors_raise_storage_error_with_details(response):
    storage, _ = _storage(lambda _r: response)
    with pytest.raises(StorageError) as excinfo:
        storage.get("attachments", "a.txt")
    assert not isinstance(excinfo.value, ObjectNotFound)
    assert str(response.status_code) in str(excinfo.value)


def test_network_failures_become_storage_errors():
    def fail(request):
        raise httpx.ConnectError("offline", request=request)

    storage, _ = _storage(fail)
    with pytest.raises(StorageError, match="Could not reach Supabase Storage"):
        storage.put("attachments", "a.txt", b"x")


def test_delete_sends_all_keys_in_one_request_and_skips_empty_lists():
    storage, seen = _storage(lambda _r: httpx.Response(200, json=[]))

    storage.delete("attachments", [])
    assert seen == []

    storage.delete("attachments", ["a", "b"])
    assert seen[0].method == "DELETE"
    assert str(seen[0].url) == f"{BASE}/storage/v1/object/attachments"
    assert json.loads(seen[0].content) == {"prefixes": ["a", "b"]}


def test_delete_raises_on_failure():
    storage, _ = _storage(lambda _r: httpx.Response(403, json={"message": "nope"}))
    with pytest.raises(StorageError, match="nope"):
        storage.delete("attachments", ["a"])


def test_list_pages_through_results_and_skips_folders(monkeypatch):
    monkeypatch.setattr(SupabaseStorage, "LIST_PAGE_SIZE", 2)
    pages = [
        [
            {"name": "a.json", "id": "1", "created_at": "2026-01-02T03:04:05.000Z", "metadata": {"size": 10}},
            {"name": "folder", "id": None},
        ],
        [{"name": "b.json", "id": "2", "updated_at": "2026-01-03T00:00:00", "metadata": None}],
    ]

    def handler(request):
        body = json.loads(request.content)
        return httpx.Response(200, json=pages[body["offset"] // 2])

    storage, seen = _storage(handler)
    objects = storage.list("backups")

    assert [o.key for o in objects] == ["a.json", "b.json"]
    assert objects[0].size_bytes == 10
    assert objects[0].created_at == datetime(2026, 1, 2, 3, 4, 5, tzinfo=UTC)
    assert objects[1].size_bytes == 0
    assert objects[1].created_at == datetime(2026, 1, 3, tzinfo=UTC)
    assert str(seen[0].url) == f"{BASE}/storage/v1/object/list/backups"
    assert len(seen) == 2


@pytest.mark.parametrize("key", ["", "a/b", "..", "a\\b"])
def test_unsafe_keys_are_rejected_everywhere(key, tmp_path):
    supabase, seen = _storage(lambda _r: httpx.Response(200))
    with pytest.raises(StorageError, match="Invalid object key"):
        supabase.put("attachments", key, b"x")
    assert seen == []
    with pytest.raises(StorageError, match="Invalid object key"):
        LocalStorage(tmp_path).put("attachments", key, b"x")


def test_local_storage_round_trip(tmp_path):
    storage = LocalStorage(tmp_path)
    assert storage.list("attachments") == []

    storage.put("attachments", "a.txt", b"hello")
    assert storage.get("attachments", "a.txt") == b"hello"
    assert [(o.key, o.size_bytes) for o in storage.list("attachments")] == [("a.txt", 5)]

    storage.delete("attachments", ["a.txt", "missing.txt"])
    with pytest.raises(ObjectNotFound):
        storage.get("attachments", "a.txt")


def test_build_storage_picks_the_backend_from_settings(tmp_path):
    local = load_settings(
        {"DATABASE_URL": "postgresql://x", "FLOWDESK_STORAGE": "local", "FLOWDESK_STORAGE_DIR": str(tmp_path)}
    )
    remote = load_settings(
        {"DATABASE_URL": "postgresql://x", "SUPABASE_URL": BASE, "SUPABASE_SERVICE_ROLE_KEY": KEY}
    )
    assert isinstance(build_storage(local), LocalStorage)
    supabase = build_storage(remote)
    assert isinstance(supabase, SupabaseStorage)
    assert supabase.base_url == f"{BASE}/storage/v1"


class _BrokenStorage:
    def __getattr__(self, _name):
        def fail(*_args, **_kwargs):
            raise StorageError("storage down")

        return fail


@pytest.fixture()
def broken_storage(monkeypatch):
    monkeypatch.setattr(storage_service, "get_storage", lambda: _BrokenStorage())
    from backend.app.services import attachment_service, backup_service

    monkeypatch.setattr(attachment_service, "get_storage", lambda: _BrokenStorage())
    monkeypatch.setattr(backup_service, "get_storage", lambda: _BrokenStorage())


def test_storage_outages_return_502_and_keep_the_database_clean(client, columns_by_name, broken_storage):
    task_id = client.post("/api/tasks", json={"title": "T", "column_id": columns_by_name["New"].id}).json()[
        "id"
    ]

    upload = client.post(
        f"/api/tasks/{task_id}/attachments", files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")}
    )
    assert upload.status_code == 502
    assert client.get(f"/api/tasks/{task_id}/attachments").json() == []

    assert client.post("/api/backup/export").status_code == 502
    assert client.get("/api/backup/list").status_code == 502
    assert client.get("/api/backup/download/flowdesk-20240101-000000.json").status_code == 502
    assert (
        client.post("/api/backup/restore", json={"filename": "flowdesk-20240101-000000.json"}).status_code
        == 502
    )


def test_deleting_a_task_survives_a_storage_outage(client, columns_by_name, monkeypatch):
    task_id = client.post("/api/tasks", json={"title": "T", "column_id": columns_by_name["New"].id}).json()[
        "id"
    ]
    client.post(
        f"/api/tasks/{task_id}/attachments", files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")}
    )
    from backend.app.services import attachment_service

    monkeypatch.setattr(attachment_service, "get_storage", lambda: _BrokenStorage())

    assert client.delete(f"/api/tasks/{task_id}").status_code == 204
    assert client.get(f"/api/tasks/{task_id}").status_code == 404


def test_download_reports_storage_errors_as_502(client, columns_by_name, monkeypatch):
    task_id = client.post("/api/tasks", json={"title": "T", "column_id": columns_by_name["New"].id}).json()[
        "id"
    ]
    attachment = client.post(
        f"/api/tasks/{task_id}/attachments", files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")}
    ).json()
    from backend.app.services import attachment_service

    monkeypatch.setattr(attachment_service, "get_storage", lambda: _BrokenStorage())

    assert client.get(f"/api/tasks/{task_id}/attachments/{attachment['id']}/download").status_code == 502


def test_new_secret_keys_are_sent_only_as_apikey():
    seen = []

    def record(request):
        seen.append(request)
        return httpx.Response(200, content=b"x")

    client = httpx.Client(transport=httpx.MockTransport(record))
    storage = SupabaseStorage(BASE, "sb_secret_abc", client=client)
    storage.get("attachments", "a.txt")

    assert seen[0].headers["apikey"] == "sb_secret_abc"
    assert "authorization" not in seen[0].headers
