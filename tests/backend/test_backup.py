import pytest

from backend.app import config
from backend.app.services import backup_service


class _FakeEngine:
    def dispose(self) -> None:
        pass


@pytest.fixture()
def isolated_backup_env(tmp_path, monkeypatch, make_database):
    db_path = tmp_path / "flowdesk.db"
    make_database(db_path, "current")
    backups_dir = tmp_path / "backups"
    backups_dir.mkdir()

    monkeypatch.setattr(config, "DB_PATH", db_path)
    monkeypatch.setattr(config, "BACKUPS_DIR", backups_dir)
    monkeypatch.setattr(backup_service, "engine", _FakeEngine())
    schema_runs = []
    monkeypatch.setattr(backup_service, "init_db", lambda: schema_runs.append(True))
    return db_path, backups_dir, schema_runs


def test_export_creates_timestamped_copy(isolated_backup_env):
    db_path, backups_dir, _ = isolated_backup_env

    info = backup_service.export_backup()

    files = list(backups_dir.glob("flowdesk-*.db"))
    assert len(files) == 1
    assert files[0].read_bytes() == db_path.read_bytes()
    assert info["filename"] == files[0].name
    assert info["size_bytes"] == db_path.stat().st_size


def test_list_backups_returns_newest_first(isolated_backup_env):
    _, backups_dir, _ = isolated_backup_env
    older = backups_dir / "flowdesk-20240101-000000.db"
    newer = backups_dir / "flowdesk-20240102-000000.db"
    older.write_bytes(b"old")
    newer.write_bytes(b"new")

    listed = backup_service.list_backups()

    assert [b["filename"] for b in listed] == [newer.name, older.name]


def test_restore_overwrites_db_with_backup_contents(isolated_backup_env, make_database):
    db_path, backups_dir, schema_runs = isolated_backup_env
    backup = backups_dir / "flowdesk-20240101-000000.db"
    contents = make_database(backup, "restored")

    backup_service.restore_backup(backup.name)

    assert db_path.read_bytes() == contents
    assert schema_runs == [True]


def test_restore_rejects_a_file_that_is_not_a_database(isolated_backup_env):
    db_path, backups_dir, schema_runs = isolated_backup_env
    before = db_path.read_bytes()
    (backups_dir / "flowdesk-20240101-000000.db").write_bytes(b"definitely not sqlite")

    with pytest.raises(ValueError, match="not a valid"):
        backup_service.restore_backup("flowdesk-20240101-000000.db")

    assert db_path.read_bytes() == before
    assert schema_runs == []


def test_restore_rejects_a_database_without_flowdesk_tables(isolated_backup_env):
    import sqlite3

    db_path, backups_dir, schema_runs = isolated_backup_env
    before = db_path.read_bytes()
    foreign = backups_dir / "flowdesk-20240101-000000.db"
    with sqlite3.connect(foreign) as conn:
        conn.execute("CREATE TABLE unrelated (id INTEGER)")
    conn.close()

    with pytest.raises(ValueError, match="not a valid Flowdesk database"):
        backup_service.restore_backup(foreign.name)

    assert db_path.read_bytes() == before
    assert schema_runs == []


@pytest.mark.usefixtures("isolated_backup_env")
def test_restore_rejects_missing_file():
    with pytest.raises(ValueError, match="not found"):
        backup_service.restore_backup("flowdesk-does-not-exist.db")


@pytest.mark.usefixtures("isolated_backup_env")
def test_restore_neutralizes_directory_components_in_filename():
    with pytest.raises(ValueError, match="not found"):
        backup_service.restore_backup("../../etc/passwd")


@pytest.mark.usefixtures("isolated_backup_env")
def test_backup_file_path_rejects_filename_resolving_to_the_backups_dir_itself():
    with pytest.raises(ValueError, match="Invalid backup filename"):
        backup_service.backup_file_path("..")
