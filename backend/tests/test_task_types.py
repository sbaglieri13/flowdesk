def test_new_task_has_no_type_by_default(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "Task", "column_id": col_id}).json()
    assert task["type"] is None


def test_default_task_type_cannot_be_renamed_or_deleted(client, task_types_by_key):
    bug_id = task_types_by_key["bug"].id

    renamed = client.patch(f"/api/task-types/{bug_id}", json={"name": "Renamed"}).json()
    assert renamed["name"] == "Bug"

    hidden = client.patch(f"/api/task-types/{bug_id}", json={"is_hidden": True}).json()
    assert hidden["is_hidden"] is True

    resp = client.delete(f"/api/task-types/{bug_id}")
    assert resp.status_code == 409


def test_create_task_with_explicit_type(client, columns_by_name, task_types_by_key):
    col_id = columns_by_name["New"].id
    bug_id = task_types_by_key["bug"].id
    task = client.post(
        "/api/tasks", json={"title": "Fix crash", "column_id": col_id, "type_id": bug_id}
    ).json()
    assert task["type"]["id"] == bug_id
    assert task["type"]["name"] == "Bug"


def test_deleting_task_type_unassigns_its_tasks(client, columns_by_name):
    col_id = columns_by_name["New"].id
    custom = client.post("/api/task-types", json={"name": "Spike", "emoji": "⚡", "color": "#94a3b8"}).json()

    task = client.post(
        "/api/tasks", json={"title": "Investigate", "column_id": col_id, "type_id": custom["id"]}
    ).json()

    resp = client.delete(f"/api/task-types/{custom['id']}")
    assert resp.status_code == 204

    moved = client.get(f"/api/tasks/{task['id']}").json()
    assert moved["type"] is None


def test_create_task_type_rejects_duplicate_name(client):
    resp = client.post("/api/task-types", json={"name": "Bug", "emoji": "🐛", "color": "#ef4444"})
    assert resp.status_code == 409


def test_chore_is_no_longer_seeded(task_types_by_key):
    assert "chore" not in task_types_by_key
    assert set(task_types_by_key.keys()) == {"bug", "feature", "improvement", "research"}
