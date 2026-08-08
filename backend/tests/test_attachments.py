import io

import pytest

from backend.app import config


@pytest.fixture()
def isolated_attachments_dir(tmp_path, monkeypatch):
    attachments_dir = tmp_path / "attachments"
    monkeypatch.setattr(config, "ATTACHMENTS_DIR", attachments_dir)
    return attachments_dir


@pytest.mark.usefixtures("isolated_attachments_dir")
def test_upload_list_download_and_delete_attachment(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task_id = client.post("/api/tasks", json={"title": "Task", "column_id": col_id}).json()["id"]

    resp = client.post(
        f"/api/tasks/{task_id}/attachments",
        files={"file": ("notes.txt", io.BytesIO(b"hello world"), "text/plain")},
    )
    assert resp.status_code == 201
    attachment = resp.json()
    assert attachment["filename"] == "notes.txt"
    assert attachment["size_bytes"] == len(b"hello world")

    listed = client.get(f"/api/tasks/{task_id}/attachments").json()
    assert len(listed) == 1

    fetched_task = client.get(f"/api/tasks/{task_id}").json()
    assert len(fetched_task["attachments"]) == 1

    downloaded = client.get(f"/api/tasks/{task_id}/attachments/{attachment['id']}/download")
    assert downloaded.status_code == 200
    assert downloaded.content == b"hello world"

    client.delete(f"/api/tasks/{task_id}/attachments/{attachment['id']}")
    assert client.get(f"/api/tasks/{task_id}/attachments").json() == []


@pytest.mark.usefixtures("isolated_attachments_dir")
def test_upload_rejects_oversized_file(client, columns_by_name, monkeypatch):
    from backend.app.services import attachment_service

    monkeypatch.setattr(attachment_service, "MAX_ATTACHMENT_SIZE", 10)
    col_id = columns_by_name["New"].id
    task_id = client.post("/api/tasks", json={"title": "Task", "column_id": col_id}).json()["id"]

    resp = client.post(
        f"/api/tasks/{task_id}/attachments",
        files={"file": ("big.txt", io.BytesIO(b"x" * 100), "text/plain")},
    )
    assert resp.status_code == 400


def test_deleting_task_removes_its_attachment_files_from_disk(
    client, columns_by_name, isolated_attachments_dir
):
    col_id = columns_by_name["New"].id
    task_id = client.post("/api/tasks", json={"title": "Task", "column_id": col_id}).json()["id"]

    client.post(
        f"/api/tasks/{task_id}/attachments",
        files={"file": ("a.txt", io.BytesIO(b"data"), "text/plain")},
    )
    assert len(list(isolated_attachments_dir.iterdir())) == 1

    resp = client.delete(f"/api/tasks/{task_id}")
    assert resp.status_code == 204
    assert list(isolated_attachments_dir.iterdir()) == []
