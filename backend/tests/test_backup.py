"""backup_service reads config.DB_PATH/BACKUPS_DIR directly (not via get_db),
so every test here monkeypatches those plus a no-op engine to avoid ever
touching the real data/flowdesk.db file or its connection pool.
"""

import pytest

from backend.app import config
from backend.app.services import backup_service


class _FakeEngine:
    def dispose(self) -> None:
        pass


@pytest.fixture()
def isolated_backup_env(tmp_path, monkeypatch):
    db_path = tmp_path / "flowdesk.db"
    db_path.write_bytes(b"fake sqlite contents")
    backups_dir = tmp_path / "backups"
    backups_dir.mkdir()

    monkeypatch.setattr(config, "DB_PATH", db_path)
    monkeypatch.setattr(config, "BACKUPS_DIR", backups_dir)
    monkeypatch.setattr(backup_service, "engine", _FakeEngine())
    return db_path, backups_dir


def test_export_creates_timestamped_copy(isolated_backup_env):
    db_path, backups_dir = isolated_backup_env

    info = backup_service.export_backup()

    files = list(backups_dir.glob("flowdesk-*.db"))
    assert len(files) == 1
    assert files[0].read_bytes() == db_path.read_bytes()
    assert info["filename"] == files[0].name
    assert info["size_bytes"] == len(b"fake sqlite contents")


def test_list_backups_returns_newest_first(isolated_backup_env):
    _, backups_dir = isolated_backup_env
    older = backups_dir / "flowdesk-20240101-000000.db"
    newer = backups_dir / "flowdesk-20240102-000000.db"
    older.write_bytes(b"old")
    newer.write_bytes(b"new")

    listed = backup_service.list_backups()

    assert [b["filename"] for b in listed] == [newer.name, older.name]


def test_restore_overwrites_db_with_backup_contents(isolated_backup_env):
    db_path, backups_dir = isolated_backup_env
    backup = backups_dir / "flowdesk-20240101-000000.db"
    backup.write_bytes(b"restored contents")

    backup_service.restore_backup(backup.name)

    assert db_path.read_bytes() == b"restored contents"


@pytest.mark.usefixtures("isolated_backup_env")
def test_restore_rejects_missing_file():
    with pytest.raises(ValueError, match="not found"):
        backup_service.restore_backup("flowdesk-does-not-exist.db")


@pytest.mark.usefixtures("isolated_backup_env")
def test_restore_neutralizes_directory_components_in_filename():
    # Path(...).name strips any directory part, so a traversal attempt just
    # gets treated as a (nonexistent) plain filename inside BACKUPS_DIR —
    # it can never reach anywhere outside it.
    with pytest.raises(ValueError, match="not found"):
        backup_service.restore_backup("../../etc/passwd")


@pytest.mark.usefixtures("isolated_backup_env")
def test_backup_file_path_rejects_filename_resolving_to_the_backups_dir_itself():
    # "..", ".", and "" all resolve to BACKUPS_DIR (or above it) rather than
    # a file inside it — this is the actual case _safe_backup_path's parent
    # check guards against.
    with pytest.raises(ValueError, match="Invalid backup filename"):
        backup_service.backup_file_path("..")
