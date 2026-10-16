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


def _upload(client, task_id, filename, content=b"data", content_type="application/octet-stream"):
    return client.post(
        f"/api/tasks/{task_id}/attachments",
        files={"file": (filename, io.BytesIO(content), content_type)},
    ).json()


@pytest.fixture()
def task_id(client, columns_by_name):
    return client.post("/api/tasks", json={"title": "Task", "column_id": columns_by_name["New"].id}).json()[
        "id"
    ]


@pytest.mark.usefixtures("isolated_attachments_dir")
@pytest.mark.parametrize(
    ("filename", "kind", "media_type"),
    [
        ("photo.PNG", "image", "image/png"),
        ("scan.jpeg", "image", "image/jpeg"),
        ("spec.pdf", "pdf", "application/pdf"),
        ("notes.md", "text", "text/plain; charset=utf-8"),
        ("data.csv", "text", "text/plain; charset=utf-8"),
        ("app.log", "text", "text/plain; charset=utf-8"),
    ],
)
def test_previewable_files_are_served_inline_with_a_safe_type(client, task_id, filename, kind, media_type):
    attachment = _upload(client, task_id, filename, content_type="text/html")
    assert attachment["preview_kind"] == kind

    response = client.get(f"/api/tasks/{task_id}/attachments/{attachment['id']}/preview")
    assert response.status_code == 200
    assert response.headers["content-type"] == media_type
    assert response.headers["content-disposition"].startswith("inline")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert ("sandbox" in response.headers.get("content-security-policy", "")) == (kind != "pdf")


@pytest.mark.usefixtures("isolated_attachments_dir")
@pytest.mark.parametrize(
    "filename", ["report.docx", "sheet.xlsx", "logo.svg", "page.html", "archive.zip", "README"]
)
def test_other_files_cannot_be_previewed(client, task_id, filename):
    attachment = _upload(
        client, task_id, filename, content=b"<script>alert(1)</script>", content_type="text/html"
    )
    assert attachment["preview_kind"] is None
    response = client.get(f"/api/tasks/{task_id}/attachments/{attachment['id']}/preview")
    assert response.status_code == 415


@pytest.mark.usefixtures("isolated_attachments_dir")
def test_download_always_forces_a_file_download(client, task_id):
    attachment = _upload(client, task_id, "photo.png", content=b"png-bytes", content_type="image/png")
    response = client.get(f"/api/tasks/{task_id}/attachments/{attachment['id']}/download")
    assert response.headers["content-disposition"].startswith("attachment")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.content == b"png-bytes"


@pytest.mark.usefixtures("isolated_attachments_dir")
def test_preview_kind_is_included_in_task_details(client, task_id):
    _upload(client, task_id, "diagram.webp")
    assert client.get(f"/api/tasks/{task_id}").json()["attachments"][0]["preview_kind"] == "image"


@pytest.mark.usefixtures("isolated_attachments_dir")
def test_preview_of_unknown_or_missing_file_returns_404(client, task_id, isolated_attachments_dir):
    assert client.get(f"/api/tasks/{task_id}/attachments/999999/preview").status_code == 404
    attachment = _upload(client, task_id, "gone.txt")
    for stored in isolated_attachments_dir.iterdir():
        stored.unlink()
    assert client.get(f"/api/tasks/{task_id}/attachments/{attachment['id']}/preview").status_code == 404
