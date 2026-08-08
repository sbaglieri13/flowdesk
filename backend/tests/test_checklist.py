def test_add_toggle_and_delete_checklist_items(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "Task", "column_id": col_id}).json()
    task_id = task["id"]

    item_a = client.post(f"/api/tasks/{task_id}/checklist", json={"text": "Step A"}).json()
    item_b = client.post(f"/api/tasks/{task_id}/checklist", json={"text": "Step B"}).json()

    items = client.get(f"/api/tasks/{task_id}/checklist").json()
    assert [i["text"] for i in items] == ["Step A", "Step B"]
    assert all(i["is_done"] is False for i in items)

    toggled = client.post(f"/api/tasks/{task_id}/checklist/{item_a['id']}/toggle").json()
    assert toggled["is_done"] is True

    client.delete(f"/api/tasks/{task_id}/checklist/{item_b['id']}")
    remaining = client.get(f"/api/tasks/{task_id}/checklist").json()
    assert len(remaining) == 1


def test_create_task_with_initial_checklist_items(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task = client.post(
        "/api/tasks",
        json={"title": "Task", "column_id": col_id, "checklist_items": ["Step one", "Step two"]},
    ).json()

    assert [i["text"] for i in task["checklist_items"]] == ["Step one", "Step two"]
    assert all(i["is_done"] is False for i in task["checklist_items"])


def test_reorder_checklist_items(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "Task", "column_id": col_id}).json()
    task_id = task["id"]

    item_a = client.post(f"/api/tasks/{task_id}/checklist", json={"text": "First"}).json()
    item_b = client.post(f"/api/tasks/{task_id}/checklist", json={"text": "Second"}).json()

    resp = client.patch(
        f"/api/tasks/{task_id}/checklist/reorder",
        json={"ordered_item_ids": [item_b["id"], item_a["id"]]},
    )
    assert resp.status_code == 200
    ordered = resp.json()
    assert [i["text"] for i in ordered] == ["Second", "First"]


def test_checklist_progress_reflected_on_task(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "Task", "column_id": col_id}).json()
    task_id = task["id"]

    item = client.post(f"/api/tasks/{task_id}/checklist", json={"text": "Only step"}).json()
    client.post(f"/api/tasks/{task_id}/checklist/{item['id']}/toggle")

    fetched = client.get(f"/api/tasks/{task_id}").json()
    assert len(fetched["checklist_items"]) == 1
    assert fetched["checklist_items"][0]["is_done"] is True
