def test_move_task_to_another_column(client, columns_by_name):
    new_id = columns_by_name["New"].id
    done_id = columns_by_name["Done"].id
    task = client.post("/api/tasks", json={"title": "Task", "column_id": new_id}).json()

    moved = client.post(f"/api/tasks/{task['id']}/move", json={"column_id": done_id}).json()

    assert moved["column_id"] == done_id

    still_listed = client.get("/api/tasks", params={"column_id": done_id}).json()
    assert any(t["id"] == task["id"] for t in still_listed)
