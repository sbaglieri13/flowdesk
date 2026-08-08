"""Central configuration: filesystem paths and server settings."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_DIR = PROJECT_ROOT / "data"
BACKUPS_DIR = DATA_DIR / "backups"
ATTACHMENTS_DIR = DATA_DIR / "attachments"
DB_PATH = DATA_DIR / "flowdesk.db"

STATIC_DIR = Path(__file__).resolve().parent / "static"

# Never expose this beyond the local machine.
HOST = "127.0.0.1"
PORT = 8000


def ensure_data_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)
