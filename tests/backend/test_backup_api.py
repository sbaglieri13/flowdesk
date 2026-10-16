import pytest

from backend.app import config
from backend.app.services import backup_service


@pytest.fixture()
def backup_env(tmp_path, monkeypatch, make_database):
    db_path = tmp_path / "flowdesk.db"
    make_database(db_path, "current")
    backups_dir = tmp_path / "backups"
    backups_dir.mkdir()
    monkeypatch.setattr(config, "DB_PATH", db_path)
    monkeypatch.setattr(config, "BACKUPS_DIR", backups_dir)
    monkeypatch.setattr(backup_service, "engine", type("FakeEngine", (), {"dispose": lambda _self: None})())
    schema_runs = []
    monkeypatch.setattr(backup_service, "init_db", lambda: schema_runs.append(True))
    return db_path, backups_dir, schema_runs


def test_export_list_download_and_restore_through_the_api(client, backup_env):
    db_path, _, schema_runs = backup_env
    original = db_path.read_bytes()

    exported = client.post("/api/backup/export").json()
    assert exported["filename"].startswith("flowdesk-") and exported["filename"].endswith(".db")
    assert [b["filename"] for b in client.get("/api/backup/list").json()] == [exported["filename"]]

    download = client.get(f"/api/backup/download/{exported['filename']}")
    assert download.status_code == 200
    assert download.content == original

    db_path.write_bytes(b"changed after backup")
    assert client.post("/api/backup/restore", json={"filename": exported["filename"]}).status_code == 204
    assert db_path.read_bytes() == original
    assert schema_runs == [True]


@pytest.mark.usefixtures("backup_env")
def test_unknown_backup_returns_404(client):
    assert client.post("/api/backup/restore", json={"filename": "flowdesk-nope.db"}).status_code == 404
    assert client.get("/api/backup/download/flowdesk-nope.db").status_code == 404


def test_restoring_an_invalid_backup_returns_400(client, backup_env):
    db_path, backups_dir, schema_runs = backup_env
    before = db_path.read_bytes()
    (backups_dir / "flowdesk-20240101-000000.db").write_bytes(b"garbage")

    resp = client.post("/api/backup/restore", json={"filename": "flowdesk-20240101-000000.db"})

    assert resp.status_code == 400
    assert db_path.read_bytes() == before
    assert schema_runs == []
