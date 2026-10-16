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


def test_breakdowns_only_count_tasks_active_in_period(client, db_session, columns_by_name, task_types_by_key):
    from backend.app.models import Task

    col_id = columns_by_name["New"].id
    bug_id = task_types_by_key["bug"].id
    old = client.post("/api/tasks", json={"title": "Old", "column_id": col_id, "type_id": bug_id}).json()
    old_logged = client.post(
        "/api/tasks", json={"title": "Old but worked on", "column_id": col_id, "type_id": bug_id}
    ).json()
    client.post("/api/tasks", json={"title": "Recent", "column_id": col_id, "type_id": bug_id})

    long_ago = datetime.datetime.now() - datetime.timedelta(days=200)
    for task_id in (old["id"], old_logged["id"]):
        db_session.get(Task, task_id).created_at = long_ago
    db_session.commit()
    client.post(f"/api/tasks/{old_logged['id']}/time-entries", json={"hours": 1, "logged_date": _iso(3)})

    recent = client.get("/api/stats/overview", params={"since": _iso(30)}).json()
    assert next(i for i in recent["by_type"] if i["label"] == "Bug")["count"] == 2

    everything = client.get("/api/stats/overview").json()
    assert next(i for i in everything["by_type"] if i["label"] == "Bug")["count"] == 3


def test_day_and_month_buckets_cover_the_whole_range(client):
    days = client.get(
        "/api/stats/overview", params={"since": "2026-03-01", "until": "2026-03-07", "bucket": "day"}
    )
    assert [b["label"] for b in days.json()["buckets"]] == [f"Mar {d:02d}" for d in range(1, 8)]

    months = client.get(
        "/api/stats/overview", params={"since": "2026-01-15", "until": "2026-03-02", "bucket": "month"}
    ).json()
    assert [b["label"] for b in months["buckets"]] == ["Jan 2026", "Feb 2026", "Mar 2026"]


def test_week_buckets_start_on_monday(client):
    weeks = client.get(
        "/api/stats/overview", params={"since": "2026-03-04", "until": "2026-03-10", "bucket": "week"}
    ).json()
    assert [b["period_start"] for b in weeks["buckets"]] == ["2026-03-02", "2026-03-09"]


def test_since_after_until_is_clamped_to_a_single_day(client):
    overview = client.get("/api/stats/overview", params={"since": "2026-05-10", "until": "2026-05-01"}).json()
    assert overview["since"] == overview["until"] == "2026-05-01"


def test_empty_board_has_zeroed_overview(client):
    overview = client.get("/api/stats/overview").json()
    assert (overview["open_tasks"], overview["closed_tasks"], overview["total_tasks"]) == (0, 0, 0)
    assert overview["avg_close_hours"] is None
    assert overview["by_type"] == overview["by_priority"] == overview["by_reporter"] == []


def test_reporter_breakdown_is_capped_at_eight(client, columns_by_name):
    col_id = columns_by_name["New"].id
    for i in range(10):
        reporter = client.post("/api/reporters", json={"name": f"Person {i}"}).json()
        client.post("/api/tasks", json={"title": f"T{i}", "column_id": col_id, "reporter_id": reporter["id"]})

    assert len(client.get("/api/stats/overview").json()["by_reporter"]) == 8


def test_tasks_closed_are_counted_in_their_bucket(client, columns_by_name):
    task = client.post("/api/tasks", json={"title": "T", "column_id": columns_by_name["New"].id}).json()
    client.post(f"/api/tasks/{task['id']}/move", json={"column_id": columns_by_name["Done"].id})

    overview = client.get("/api/stats/overview", params={"since": _iso(6), "bucket": "day"}).json()
    assert overview["buckets"][-1]["tasks_closed"] == 1
    assert sum(b["tasks_closed"] for b in overview["buckets"]) == 1
