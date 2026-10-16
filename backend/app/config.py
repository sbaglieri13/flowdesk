import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
STATIC_DIR = Path(__file__).resolve().parent / "static"
SETUP_GUIDE = "docs/supabase-setup.md"

load_dotenv(PROJECT_ROOT / ".env", override=False)


class ConfigError(RuntimeError):
    pass


@dataclass(frozen=True)
class Settings:
    database_url: str
    storage_backend: str
    supabase_url: str
    supabase_service_role_key: str
    attachments_bucket: str
    backups_bucket: str
    local_storage_dir: Path | None
    host: str
    port: int


def normalize_database_url(url: str) -> str:
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


SUPABASE_API_SUFFIXES = ("/rest/v1", "/storage/v1", "/auth/v1")


def normalize_supabase_url(url: str) -> str:
    url = url.strip().rstrip("/")
    if not url:
        return url
    parsed = urlsplit(url)
    path = parsed.path.rstrip("/")
    for suffix in SUPABASE_API_SUFFIXES:
        if path.endswith(suffix):
            path = path[: -len(suffix)]
            break
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or path or parsed.query:
        raise ConfigError(
            f"SUPABASE_URL must be the Project URL, like https://your-project-ref.supabase.co (got '{url}')."
        )
    return f"{parsed.scheme}://{parsed.netloc}"


def load_settings(env: dict[str, str] | None = None) -> Settings:
    env = dict(os.environ) if env is None else env

    def get(name: str, default: str = "") -> str:
        return (env.get(name) or default).strip()

    storage_backend = get("FLOWDESK_STORAGE", "supabase").lower()
    if storage_backend not in {"supabase", "local"}:
        raise ConfigError(f"FLOWDESK_STORAGE must be 'supabase' or 'local', got '{storage_backend}'.")

    required = ["DATABASE_URL"]
    if storage_backend == "supabase":
        required += ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    else:
        required.append("FLOWDESK_STORAGE_DIR")
    missing = [name for name in required if not get(name)]
    if missing:
        raise ConfigError(
            f"Missing required settings: {', '.join(missing)}. "
            f"Copy .env.example to .env and fill it in (see {SETUP_GUIDE})."
        )

    port = get("FLOWDESK_PORT", "8000")
    if not port.isdigit() or not 1 <= int(port) <= 65535:
        raise ConfigError(f"FLOWDESK_PORT must be a port number between 1 and 65535, got '{port}'.")

    local_dir = get("FLOWDESK_STORAGE_DIR")
    return Settings(
        database_url=normalize_database_url(get("DATABASE_URL")),
        storage_backend=storage_backend,
        supabase_url=normalize_supabase_url(get("SUPABASE_URL")),
        supabase_service_role_key=get("SUPABASE_SERVICE_ROLE_KEY"),
        attachments_bucket=get("SUPABASE_ATTACHMENTS_BUCKET", "attachments"),
        backups_bucket=get("SUPABASE_BACKUPS_BUCKET", "backups"),
        local_storage_dir=Path(local_dir) if local_dir else None,
        host=get("FLOWDESK_HOST", "127.0.0.1"),
        port=int(port),
    )


settings = load_settings()
