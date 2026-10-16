import pytest

MISSING = 999_999


@pytest.fixture()
def task(client, columns_by_name):
    return client.post("/api/tasks", json={"title": "Task", "column_id": columns_by_name["New"].id}).json()


@pytest.mark.parametrize(
    ("method", "url", "body"),
    [
        ("get", f"/api/tasks/{MISSING}", None),
        ("patch", f"/api/tasks/{MISSING}", {"title": "x"}),
        ("delete", f"/api/tasks/{MISSING}", None),
        ("post", f"/api/tasks/{MISSING}/move", {"column_id": 1}),
        ("patch", f"/api/columns/{MISSING}", {"name": "x"}),
        ("delete", f"/api/columns/{MISSING}", None),
        ("patch", f"/api/tags/{MISSING}", {"name": "x"}),
        ("delete", f"/api/tags/{MISSING}", None),
        ("patch", f"/api/priorities/{MISSING}", {"name": "x"}),
        ("delete", f"/api/priorities/{MISSING}", None),
        ("patch", f"/api/task-types/{MISSING}", {"name": "x"}),
        ("delete", f"/api/task-types/{MISSING}", None),
        ("patch", f"/api/reporters/{MISSING}", {"name": "x"}),
        ("delete", f"/api/reporters/{MISSING}", None),
        ("get", f"/api/tasks/{MISSING}/checklist", None),
        ("post", f"/api/tasks/{MISSING}/checklist", {"text": "x"}),
        ("get", f"/api/tasks/{MISSING}/time-entries", None),
        ("post", f"/api/tasks/{MISSING}/time-entries", {"hours": 1}),
        ("get", f"/api/tasks/{MISSING}/attachments", None),
    ],
)
def test_unknown_resources_return_404(client, method, url, body):
    response = getattr(client, method)(url, **({"json": body} if body is not None else {}))
    assert response.status_code == 404


def test_unknown_child_items_of_an_existing_task_return_404(client, task):
    base = f"/api/tasks/{task['id']}"
    assert client.patch(f"{base}/checklist/{MISSING}", json={"text": "x"}).status_code == 404
    assert client.post(f"{base}/checklist/{MISSING}/toggle").status_code == 404
    assert client.delete(f"{base}/checklist/{MISSING}").status_code == 404
    assert client.patch(f"{base}/time-entries/{MISSING}", json={"hours": 1}).status_code == 404
    assert client.delete(f"{base}/time-entries/{MISSING}").status_code == 404
    assert client.get(f"{base}/attachments/{MISSING}/download").status_code == 404
    assert client.delete(f"{base}/attachments/{MISSING}").status_code == 404


def test_checklist_item_of_another_task_is_not_reachable(client, columns_by_name, task):
    other = client.post("/api/tasks", json={"title": "Other", "column_id": columns_by_name["New"].id}).json()
    item = client.post(f"/api/tasks/{other['id']}/checklist", json={"text": "Not yours"}).json()

    assert (
        client.patch(f"/api/tasks/{task['id']}/checklist/{item['id']}", json={"text": "x"}).status_code == 404
    )
    reorder = client.patch(
        f"/api/tasks/{task['id']}/checklist/reorder", json={"ordered_item_ids": [item["id"]]}
    )
    assert reorder.status_code == 400


@pytest.mark.parametrize(
    "payload",
    [
        {"column_id": MISSING},
        {"priority_id": MISSING},
        {"type_id": MISSING},
        {"reporter_id": MISSING},
        {"tag_ids": [MISSING]},
    ],
)
def test_create_task_with_unknown_references_returns_400(client, columns_by_name, payload):
    body = {"title": "Task", "column_id": columns_by_name["New"].id, **payload}
    response = client.post("/api/tasks", json=body)
    assert response.status_code == 400
    assert "not found" in response.json()["detail"].lower() or "unknown" in response.json()["detail"].lower()


@pytest.mark.parametrize(
    "payload",
    [{"priority_id": MISSING}, {"type_id": MISSING}, {"reporter_id": MISSING}, {"tag_ids": [MISSING]}],
)
def test_update_task_with_unknown_references_returns_400(client, task, payload):
    assert client.patch(f"/api/tasks/{task['id']}", json=payload).status_code == 400


def test_moving_to_unknown_column_returns_400(client, task):
    assert client.post(f"/api/tasks/{task['id']}/move", json={"column_id": MISSING}).status_code == 400


def test_reorder_rejects_tasks_from_another_column(client, columns_by_name, task):
    response = client.post(
        "/api/tasks/reorder", json={"column_id": columns_by_name["Done"].id, "ordered_task_ids": [task["id"]]}
    )
    assert response.status_code == 400


def test_reorder_rejects_unknown_task(client, columns_by_name):
    response = client.post(
        "/api/tasks/reorder", json={"column_id": columns_by_name["New"].id, "ordered_task_ids": [MISSING]}
    )
    assert response.status_code == 400


def test_column_reorder_with_unknown_column_returns_404(client):
    response = client.patch("/api/columns/reorder", json={"items": [{"id": MISSING, "position": 0}]})
    assert response.status_code == 404


@pytest.mark.parametrize(
    ("url", "payload"),
    [
        ("/api/tasks", {"title": "", "column_id": 1}),
        ("/api/tasks", {"title": "x" * 201, "column_id": 1}),
        ("/api/tasks", {"title": "No column"}),
        ("/api/tasks/auto-sort", {"column_id": 1, "sort_by": "title"}),
        ("/api/tasks/auto-sort", {"column_id": 1, "sort_by": "priority", "order": "sideways"}),
        ("/api/columns", {"name": ""}),
        ("/api/tags", {"name": ""}),
        ("/api/priorities", {"name": "P", "icon": "", "color": "#000000"}),
        ("/api/priorities", {"name": "P", "icon": "Not An Icon", "color": "#000000"}),
        ("/api/task-types", {"name": "T", "icon": "", "color": "#000000"}),
        ("/api/tags", {"name": "T", "icon": "<svg>", "color": "#000000"}),
        ("/api/columns", {"name": "C", "icon": "bad icon"}),
        ("/api/tags", {"name": "T", "color": "red"}),
        ("/api/tags", {"name": "T", "color": "#12345"}),
        ("/api/priorities", {"name": "P", "icon": "fire", "color": "#abc"}),
        ("/api/task-types", {"name": "T", "icon": "bug", "color": "url(evil)"}),
        ("/api/reporters", {"name": ""}),
    ],
)
def test_invalid_payloads_return_422(client, url, payload):
    assert client.post(url, json=payload).status_code == 422


@pytest.mark.parametrize("hours", [0, -1, 1000])
def test_time_entry_hours_out_of_range_return_422(client, task, hours):
    assert client.post(f"/api/tasks/{task['id']}/time-entries", json={"hours": hours}).status_code == 422


def test_doc_url_longer_than_500_chars_returns_422(client, columns_by_name):
    body = {"title": "Task", "column_id": columns_by_name["New"].id, "doc_urls": ["https://x/" + "a" * 500]}
    assert client.post("/api/tasks", json=body).status_code == 422


def test_stats_rejects_ranges_that_are_too_wide(client):
    response = client.get("/api/stats/overview", params={"since": "1900-01-01", "until": "2026-01-01"})
    assert response.status_code == 400


def test_stats_rejects_unknown_bucket(client):
    assert client.get("/api/stats/overview", params={"bucket": "year"}).status_code == 422
