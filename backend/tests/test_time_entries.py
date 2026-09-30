def test_add_update_and_delete_time_entries(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "Task", "column_id": col_id}).json()
    task_id = task["id"]

    entry_a = client.post(
        f"/api/tasks/{task_id}/time-entries", json={"hours": 2.5, "logged_date": "2026-01-05"}
    ).json()
    entry_b = client.post(
        f"/api/tasks/{task_id}/time-entries", json={"hours": 1, "note": "Review", "logged_date": "2026-01-06"}
    ).json()

    entries = client.get(f"/api/tasks/{task_id}/time-entries").json()
    assert len(entries) == 2

    updated = client.patch(f"/api/tasks/{task_id}/time-entries/{entry_a['id']}", json={"hours": 3}).json()
    assert updated["hours"] == 3

    client.delete(f"/api/tasks/{task_id}/time-entries/{entry_b['id']}")
    remaining = client.get(f"/api/tasks/{task_id}/time-entries").json()
    assert len(remaining) == 1


def test_time_entry_defaults_to_today(client, columns_by_name):
    import datetime

    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "Task", "column_id": col_id}).json()

    entry = client.post(f"/api/tasks/{task['id']}/time-entries", json={"hours": 1.5}).json()
    assert entry["logged_date"] == datetime.date.today().isoformat()


def test_task_total_hours_reflects_logged_entries(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "Task", "column_id": col_id}).json()
    task_id = task["id"]

    client.post(f"/api/tasks/{task_id}/time-entries", json={"hours": 2, "logged_date": "2026-01-05"})
    client.post(f"/api/tasks/{task_id}/time-entries", json={"hours": 1.25, "logged_date": "2026-01-06"})

    fetched = client.get(f"/api/tasks/{task_id}").json()
    assert fetched["total_hours"] == 3.25
    assert len(fetched["time_entries"]) == 2


def test_time_entry_rejects_non_positive_hours(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "Task", "column_id": col_id}).json()

    resp = client.post(f"/api/tasks/{task['id']}/time-entries", json={"hours": 0})
    assert resp.status_code == 422
