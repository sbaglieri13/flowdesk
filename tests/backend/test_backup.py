import json

import pytest

from backend.app.config import settings
from backend.app.models import Task
from backend.app.services import backup_service


@pytest.fixture()
def backups_dir(storage_root):
    path = storage_root / settings.backups_bucket
    path.mkdir(parents=True, exist_ok=True)
    return path


def _make_board(client, columns_by_name):
    col_id = columns_by_name["New"].id
    reporter = client.post("/api/reporters", json={"name": "Ann"}).json()
    tag = client.post("/api/tags", json={"name": "ops", "color": "#123456"}).json()
    task = client.post(
        "/api/tasks",
        json={
            "title": "Backed up",
            "column_id": col_id,
            "reporter_id": reporter["id"],
            "tag_ids": [tag["id"]],
            "deadline": "2026-03-01",
            "doc_urls": ["https://example.com/doc"],
            "checklist_items": ["step"],
        },
    ).json()
    client.post(f"/api/tasks/{task['id']}/time-entries", json={"hours": 1.5, "logged_date": "2026-02-01"})
    return task


def test_export_list_download_and_restore_round_trip(client, columns_by_name, backups_dir):
    task = _make_board(client, columns_by_name)

    exported = client.post("/api/backup/export").json()
    assert exported["filename"].startswith("flowdesk-") and exported["filename"].endswith(".json")
    assert [b["filename"] for b in client.get("/api/backup/list").json()] == [exported["filename"]]

    download = client.get(f"/api/backup/download/{exported['filename']}")
    assert download.status_code == 200
    assert download.headers["content-type"] == "application/json"
    payload = json.loads(download.content)
    assert payload["format"] == "flowdesk-backup"
    assert len(payload["tables"]["tasks"]) == 1

    client.delete(f"/api/tasks/{task['id']}")
    client.post("/api/tasks", json={"title": "Created after backup", "column_id": columns_by_name["New"].id})

    assert client.post("/api/backup/restore", json={"filename": exported["filename"]}).status_code == 204

    titles = [t["title"] for t in client.get("/api/tasks").json()]
    assert titles == ["Backed up"]
    restored = client.get(f"/api/tasks/{task['id']}").json()
    assert restored["reporter"]["name"] == "Ann"
    assert [t["name"] for t in restored["tags"]] == ["ops"]
    assert restored["deadline"] == "2026-03-01"
    assert restored["doc_urls"] == ["https://example.com/doc"]
    assert restored["total_hours"] == 1.5
    assert restored["checklist_items"][0]["text"] == "step"


def test_ids_keep_growing_after_a_restore(client, columns_by_name, backups_dir):
    task = _make_board(client, columns_by_name)
    exported = client.post("/api/backup/export").json()
    client.post("/api/backup/restore", json={"filename": exported["filename"]})

    created = client.post(
        "/api/tasks", json={"title": "After", "column_id": columns_by_name["New"].id}
    ).json()

    assert created["id"] > task["id"]
    assert created["display_code"] == "FD-2"


def test_two_exports_in_the_same_second_get_distinct_names(client, backups_dir):
    first = client.post("/api/backup/export").json()["filename"]
    second = client.post("/api/backup/export").json()["filename"]
    assert first != second
    assert len(client.get("/api/backup/list").json()) == 2


def test_list_ignores_foreign_files(client, backups_dir):
    (backups_dir / "notes.txt").write_text("x")
    assert client.get("/api/backup/list").json() == []


@pytest.mark.parametrize("filename", ["flowdesk-nope.json", "flowdesk-20240101-000000.db"])
def test_unknown_backup_returns_404(client, backups_dir, filename):
    assert client.post("/api/backup/restore", json={"filename": filename}).status_code == 404
    assert client.get(f"/api/backup/download/{filename}").status_code == 404


def test_path_components_in_the_filename_are_rejected(client, backups_dir):
    assert client.post("/api/backup/restore", json={"filename": "../../etc/passwd"}).status_code == 404


def _write_backup(backups_dir, payload) -> str:
    name = "flowdesk-20240101-000000.json"
    data = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
    (backups_dir / name).write_bytes(data)
    return name


def _valid_payload(db_session):
    return json.loads(json.dumps(backup_service.build_backup(db_session)))


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda _p: b"not json", "not valid JSON"),
        (lambda p: {**p, "format": "other"}, "not a Flowdesk backup"),
        (lambda p: {**p, "format_version": 99}, "Unsupported backup version"),
        (lambda p: {**p, "tables": {"tasks": []}}, "expected tables"),
        (lambda p: {**p, "tables": {**p["tables"], "tags": [{"id": 1, "bogus": 1}]}}, "unknown columns"),
        (lambda p: {**p, "tables": {**p["tables"], "tags": [{"id": 1, "name": "x"}]}}, "missing required"),
        (lambda p: {**p, "tables": {**p["tables"], "tasks": "nope"}}, "malformed"),
    ],
)
def test_invalid_backups_are_rejected_before_touching_data(
    client, columns_by_name, db_session, backups_dir, mutate, message
):
    _make_board(client, columns_by_name)
    name = _write_backup(backups_dir, mutate(_valid_payload(db_session)))

    resp = client.post("/api/backup/restore", json={"filename": name})

    assert resp.status_code == 400
    assert message in resp.json()["detail"]
    assert [t["title"] for t in client.get("/api/tasks").json()] == ["Backed up"]


def test_inconsistent_data_rolls_back_the_whole_restore(client, columns_by_name, db_session, backups_dir):
    _make_board(client, columns_by_name)
    payload = _valid_payload(db_session)
    payload["tables"]["tasks"][0]["column_id"] = 9999
    name = _write_backup(backups_dir, payload)

    resp = client.post("/api/backup/restore", json={"filename": name})

    assert resp.status_code == 400
    assert "inconsistent" in resp.json()["detail"]
    assert db_session.query(Task).count() == 1
    assert [t["title"] for t in client.get("/api/tasks").json()] == ["Backed up"]


def test_bad_date_is_reported_and_rolled_back(client, columns_by_name, db_session, backups_dir):
    _make_board(client, columns_by_name)
    payload = _valid_payload(db_session)
    payload["tables"]["tasks"][0]["deadline"] = "not-a-date"
    name = _write_backup(backups_dir, payload)

    resp = client.post("/api/backup/restore", json={"filename": name})

    assert resp.status_code == 400
    assert "Invalid date in tasks.deadline" in resp.json()["detail"]
    assert [t["title"] for t in client.get("/api/tasks").json()] == ["Backed up"]


def test_backup_times_are_sent_with_their_timezone(client, backups_dir):
    exported = client.post("/api/backup/export").json()
    listed = client.get("/api/backup/list").json()[0]

    for value in (exported["created_at"], listed["created_at"]):
        assert value.endswith(("Z", "+00:00"))
