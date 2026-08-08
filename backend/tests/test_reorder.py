def test_reorder_tasks_within_column(client, columns_by_name):
    col_id = columns_by_name["New"].id
    a = client.post("/api/tasks", json={"title": "A", "column_id": col_id}).json()
    b = client.post("/api/tasks", json={"title": "B", "column_id": col_id}).json()
    c = client.post("/api/tasks", json={"title": "C", "column_id": col_id}).json()

    resp = client.post(
        "/api/tasks/reorder",
        json={"column_id": col_id, "ordered_task_ids": [c["id"], a["id"], b["id"]]},
    )
    assert resp.status_code == 204

    tasks = client.get("/api/tasks", params={"column_id": col_id}).json()
    ordered_titles = [t["title"] for t in sorted(tasks, key=lambda t: t["position"])]
    assert ordered_titles == ["C", "A", "B"]


def test_auto_sort_by_priority(client, columns_by_name, priorities_by_key):
    col_id = columns_by_name["New"].id
    client.post(
        "/api/tasks",
        json={"title": "Low one", "column_id": col_id, "priority_id": priorities_by_key["low"].id},
    )
    client.post(
        "/api/tasks",
        json={"title": "Urgent one", "column_id": col_id, "priority_id": priorities_by_key["urgent"].id},
    )
    client.post(
        "/api/tasks",
        json={"title": "Medium one", "column_id": col_id, "priority_id": priorities_by_key["medium"].id},
    )

    resp = client.post("/api/tasks/auto-sort", json={"column_id": col_id, "sort_by": "priority"})
    assert resp.status_code == 204

    tasks = client.get("/api/tasks", params={"column_id": col_id}).json()
    ordered_titles = [t["title"] for t in sorted(tasks, key=lambda t: t["position"])]
    assert ordered_titles == ["Urgent one", "Medium one", "Low one"]


def test_auto_sort_by_deadline_puts_no_deadline_last(client, columns_by_name):
    col_id = columns_by_name["New"].id
    client.post("/api/tasks", json={"title": "No deadline", "column_id": col_id})
    client.post("/api/tasks", json={"title": "Due later", "column_id": col_id, "deadline": "2030-06-01"})
    client.post("/api/tasks", json={"title": "Due soon", "column_id": col_id, "deadline": "2030-01-01"})

    resp = client.post("/api/tasks/auto-sort", json={"column_id": col_id, "sort_by": "deadline"})
    assert resp.status_code == 204

    tasks = client.get("/api/tasks", params={"column_id": col_id}).json()
    ordered_titles = [t["title"] for t in sorted(tasks, key=lambda t: t["position"])]
    assert ordered_titles == ["Due soon", "Due later", "No deadline"]
