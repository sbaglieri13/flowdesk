import datetime


def _iso(days_ago: int) -> str:
    return (datetime.date.today() - datetime.timedelta(days=days_ago)).isoformat()


def test_overview_counts_open_and_closed_tasks(client, columns_by_name):
    new_id = columns_by_name["New"].id
    done_id = columns_by_name["Done"].id

    open_task = client.post("/api/tasks", json={"title": "Open task", "column_id": new_id}).json()
    closed_task = client.post("/api/tasks", json={"title": "Closed task", "column_id": new_id}).json()
    client.post(f"/api/tasks/{closed_task['id']}/move", json={"column_id": done_id})

    overview = client.get("/api/stats/overview").json()
    assert overview["open_tasks"] == 1
    assert overview["closed_tasks"] == 1
    assert overview["total_tasks"] == 2
    assert overview["avg_close_hours"] is not None
    assert open_task["id"] != closed_task["id"]


def test_reopening_a_task_clears_closed_at(client, columns_by_name):
    new_id = columns_by_name["New"].id
    done_id = columns_by_name["Done"].id
    task = client.post("/api/tasks", json={"title": "Task", "column_id": new_id}).json()

    client.post(f"/api/tasks/{task['id']}/move", json={"column_id": done_id})
    reopened = client.post(f"/api/tasks/{task['id']}/move", json={"column_id": new_id}).json()
    assert reopened["closed_at"] is None

    overview = client.get("/api/stats/overview").json()
    assert overview["open_tasks"] == 1
    assert overview["closed_tasks"] == 0


def test_hours_logged_are_bucketed_by_week(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "Task", "column_id": col_id}).json()

    client.post(f"/api/tasks/{task['id']}/time-entries", json={"hours": 2, "logged_date": _iso(1)})
    client.post(f"/api/tasks/{task['id']}/time-entries", json={"hours": 3, "logged_date": _iso(2)})

    overview = client.get("/api/stats/overview", params={"since": _iso(13), "bucket": "week"}).json()
    assert overview["total_hours_logged"] == 5
    assert sum(b["hours_logged"] for b in overview["buckets"]) == 5


def test_breakdown_by_type_and_priority(client, columns_by_name, task_types_by_key, priorities_by_key):
    col_id = columns_by_name["New"].id
    client.post(
        "/api/tasks",
        json={
            "title": "A bug",
            "column_id": col_id,
            "type_id": task_types_by_key["bug"].id,
            "priority_id": priorities_by_key["urgent"].id,
        },
    )
    client.post(
        "/api/tasks",
        json={
            "title": "Another bug",
            "column_id": col_id,
            "type_id": task_types_by_key["bug"].id,
            "priority_id": priorities_by_key["low"].id,
        },
    )

    overview = client.get("/api/stats/overview").json()
    bug_entry = next(item for item in overview["by_type"] if item["label"] == "Bug")
    assert bug_entry["count"] == 2


def test_overview_without_since_defaults_to_earliest_task(client, columns_by_name):
    col_id = columns_by_name["New"].id
    client.post("/api/tasks", json={"title": "Task", "column_id": col_id})

    overview = client.get("/api/stats/overview").json()
    assert overview["since"] == datetime.date.today().isoformat()
    assert overview["until"] == datetime.date.today().isoformat()


def test_overview_accepts_an_explicit_since_and_until(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "Task", "column_id": col_id}).json()
    client.post(f"/api/tasks/{task['id']}/time-entries", json={"hours": 1, "logged_date": _iso(30)})
    client.post(f"/api/tasks/{task['id']}/time-entries", json={"hours": 1, "logged_date": _iso(5)})

    overview = client.get(
        "/api/stats/overview", params={"since": _iso(10), "until": _iso(1), "bucket": "day"}
    ).json()
    assert overview["since"] == _iso(10)
    assert overview["until"] == _iso(1)
    assert overview["total_hours_logged"] == 1


def test_breakdown_by_reporter_groups_blank_as_unassigned(client, columns_by_name):
    col_id = columns_by_name["New"].id
    giulia_id = client.post("/api/reporters", json={"name": "Giulia"}).json()["id"]
    client.post("/api/tasks", json={"title": "No reporter", "column_id": col_id})
    client.post("/api/tasks", json={"title": "Has reporter", "column_id": col_id, "reporter_id": giulia_id})

    overview = client.get("/api/stats/overview").json()
    labels = {item["label"]: item["count"] for item in overview["by_reporter"]}
    assert labels["Unassigned"] == 1
    assert labels["Giulia"] == 1
