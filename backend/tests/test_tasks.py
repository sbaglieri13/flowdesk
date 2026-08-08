def test_create_task_assigns_incrementing_display_code(client, columns_by_name):
    col_id = columns_by_name["New"].id

    first = client.post("/api/tasks", json={"title": "First task", "column_id": col_id}).json()
    second = client.post("/api/tasks", json={"title": "Second task", "column_id": col_id}).json()

    assert first["display_code"] == "FD-1"
    assert second["display_code"] == "FD-2"


def test_update_task_fields(client, columns_by_name, priorities_by_key):
    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "Draft title", "column_id": col_id}).json()

    updated = client.patch(
        f"/api/tasks/{task['id']}",
        json={
            "title": "Final title",
            "priority_id": priorities_by_key["urgent"].id,
            "external_reference": "PROJ-1",
        },
    ).json()

    assert updated["title"] == "Final title"
    assert updated["priority"]["name"] == "Urgent"
    assert updated["external_reference"] == "PROJ-1"


def test_delete_task(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "To delete", "column_id": col_id}).json()

    resp = client.delete(f"/api/tasks/{task['id']}")
    assert resp.status_code == 204

    assert client.get(f"/api/tasks/{task['id']}").status_code == 404


def test_search_and_priority_filters(client, columns_by_name, priorities_by_key):
    col_id = columns_by_name["New"].id
    client.post(
        "/api/tasks",
        json={"title": "Fix login bug", "column_id": col_id, "priority_id": priorities_by_key["urgent"].id},
    )
    client.post(
        "/api/tasks",
        json={"title": "Write docs", "column_id": col_id, "priority_id": priorities_by_key["low"].id},
    )

    by_search = client.get("/api/tasks", params={"search": "login"}).json()
    assert len(by_search) == 1
    assert by_search[0]["title"] == "Fix login bug"

    by_priority = client.get("/api/tasks", params={"priority_id": priorities_by_key["low"].id}).json()
    assert len(by_priority) == 1
    assert by_priority[0]["title"] == "Write docs"


def test_priority_filter_accepts_multiple_ids(client, columns_by_name, priorities_by_key):
    col_id = columns_by_name["New"].id
    client.post(
        "/api/tasks",
        json={"title": "Urgent one", "column_id": col_id, "priority_id": priorities_by_key["urgent"].id},
    )
    client.post(
        "/api/tasks",
        json={"title": "Low one", "column_id": col_id, "priority_id": priorities_by_key["low"].id},
    )
    client.post(
        "/api/tasks",
        json={"title": "Medium one", "column_id": col_id, "priority_id": priorities_by_key["medium"].id},
    )

    urgent_id = priorities_by_key["urgent"].id
    low_id = priorities_by_key["low"].id
    resp = client.get("/api/tasks", params=[("priority_id", urgent_id), ("priority_id", low_id)])
    titles = {t["title"] for t in resp.json()}
    assert titles == {"Urgent one", "Low one"}


def test_tag_filter_and_no_tag_sentinel(client, columns_by_name):
    col_id = columns_by_name["New"].id
    tag = client.post("/api/tags", json={"name": "backend", "color": "#6366f1"}).json()

    client.post("/api/tasks", json={"title": "Tagged", "column_id": col_id, "tag_ids": [tag["id"]]})
    client.post("/api/tasks", json={"title": "Untagged", "column_id": col_id})

    by_tag = client.get("/api/tasks", params={"tag_id": tag["id"]}).json()
    assert [t["title"] for t in by_tag] == ["Tagged"]

    # -1 is the frontend's sentinel for "no tags at all" — never a real tag id.
    by_no_tag = client.get("/api/tasks", params={"tag_id": -1}).json()
    assert [t["title"] for t in by_no_tag] == ["Untagged"]

    by_either = client.get("/api/tasks", params=[("tag_id", tag["id"]), ("tag_id", -1)]).json()
    titles = {t["title"] for t in by_either}
    assert titles == {"Tagged", "Untagged"}


def test_search_matches_notes_and_external_reference(client, columns_by_name):
    col_id = columns_by_name["New"].id
    client.post(
        "/api/tasks",
        json={
            "title": "Investigate outage",
            "column_id": col_id,
            "notes": "Root cause was a stale cache entry",
            "external_reference": "INFRA-42",
        },
    )
    client.post("/api/tasks", json={"title": "Unrelated task", "column_id": col_id})

    by_notes = client.get("/api/tasks", params={"search": "stale cache"}).json()
    assert len(by_notes) == 1
    assert by_notes[0]["title"] == "Investigate outage"

    by_reference = client.get("/api/tasks", params={"search": "INFRA-42"}).json()
    assert len(by_reference) == 1
    assert by_reference[0]["title"] == "Investigate outage"


def test_external_reference_url_uses_configured_base_url(client, columns_by_name):
    client.put("/api/settings", json={"external_reference_base_url": "https://example.atlassian.net/browse"})
    col_id = columns_by_name["New"].id
    task = client.post(
        "/api/tasks", json={"title": "Linked task", "column_id": col_id, "external_reference": "PROJ-42"}
    ).json()

    assert task["external_reference_url"] == "https://example.atlassian.net/browse/PROJ-42"
