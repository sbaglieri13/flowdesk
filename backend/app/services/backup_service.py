"""Export/list/restore operations on the SQLite database file."""

import shutil
from datetime import datetime
from pathlib import Path

from backend.app import config
from backend.app.database import engine


def _backup_info(path: Path) -> dict:
    stat = path.stat()
    return {
        "filename": path.name,
        "size_bytes": stat.st_size,
        "created_at": datetime.fromtimestamp(stat.st_mtime),
    }


def _safe_backup_path(filename: str) -> Path:
    """Resolve a backup filename to a path guaranteed to live inside BACKUPS_DIR."""
    candidate = config.BACKUPS_DIR / Path(filename).name
    if candidate.resolve().parent != config.BACKUPS_DIR.resolve():
        raise ValueError("Invalid backup filename")
    return candidate


def export_backup() -> dict:
    config.ensure_data_dirs()
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = config.BACKUPS_DIR / f"flowdesk-{timestamp}.db"
    engine.dispose()  # release SQLite file locks before copying
    shutil.copy2(config.DB_PATH, dest)
    return _backup_info(dest)


def list_backups() -> list[dict]:
    config.ensure_data_dirs()
    files = sorted(config.BACKUPS_DIR.glob("flowdesk-*.db"), reverse=True)
    return [_backup_info(f) for f in files]


def restore_backup(filename: str) -> None:
    src = _safe_backup_path(filename)
    if not src.is_file():
        raise ValueError(f"Backup file not found: {filename}")
    engine.dispose()
    shutil.copy2(src, config.DB_PATH)


def backup_file_path(filename: str) -> Path:
    path = _safe_backup_path(filename)
    if not path.is_file():
        raise ValueError(f"Backup file not found: {filename}")
    return path
