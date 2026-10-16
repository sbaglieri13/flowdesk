def test_create_task_assigns_incrementing_display_code(client, columns_by_name):
    col_id = columns_by_name["New"].id

    first = client.post("/api/tasks", json={"title": "First task", "column_id": col_id}).json()
    second = client.post("/api/tasks", json={"title": "Second task", "column_id": col_id}).json()

    assert first["display_code"] == "FD-1"
    assert second["display_code"] == "FD-2"


def test_update_task_fields(client, columns_by_name, priorities_by_key):
    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "Draft title", "column_id": col_id}).json()
    reporter = client.post("/api/reporters", json={"name": "Marco Rossi"}).json()

    updated = client.patch(
        f"/api/tasks/{task['id']}",
        json={
            "title": "Final title",
            "priority_id": priorities_by_key["urgent"].id,
            "external_reference": "PROJ-1",
            "reporter_id": reporter["id"],
            "doc_urls": ["https://example.atlassian.net/wiki/PROJ-1"],
        },
    ).json()

    assert updated["title"] == "Final title"
    assert updated["priority"]["name"] == "Urgent"
    assert updated["external_reference"] == "PROJ-1"
    assert updated["reporter"]["name"] == "Marco Rossi"
    assert updated["doc_urls"] == ["https://example.atlassian.net/wiki/PROJ-1"]


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

    by_no_tag = client.get("/api/tasks", params={"tag_id": -1}).json()
    assert [t["title"] for t in by_no_tag] == ["Untagged"]

    by_either = client.get("/api/tasks", params=[("tag_id", tag["id"]), ("tag_id", -1)]).json()
    titles = {t["title"] for t in by_either}
    assert titles == {"Tagged", "Untagged"}


def test_type_filter_and_unassigned_sentinel(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task_type = client.get("/api/task-types").json()[0]

    client.post("/api/tasks", json={"title": "Typed", "column_id": col_id, "type_id": task_type["id"]})
    client.post("/api/tasks", json={"title": "Untyped", "column_id": col_id})

    by_type = client.get("/api/tasks", params={"type_id": task_type["id"]}).json()
    assert [t["title"] for t in by_type] == ["Typed"]

    by_unassigned = client.get("/api/tasks", params={"type_id": -1}).json()
    assert [t["title"] for t in by_unassigned] == ["Untyped"]

    by_either = client.get("/api/tasks", params=[("type_id", task_type["id"]), ("type_id", -1)]).json()
    titles = {t["title"] for t in by_either}
    assert titles == {"Typed", "Untyped"}


def test_reporter_filter_and_no_reporter_sentinel(client, columns_by_name):
    col_id = columns_by_name["New"].id
    reporter = client.post("/api/reporters", json={"name": "Marco Rossi"}).json()

    client.post("/api/tasks", json={"title": "Reported", "column_id": col_id, "reporter_id": reporter["id"]})
    client.post("/api/tasks", json={"title": "Unreported", "column_id": col_id})

    by_reporter = client.get("/api/tasks", params={"reporter_id": reporter["id"]}).json()
    assert [t["title"] for t in by_reporter] == ["Reported"]

    by_none = client.get("/api/tasks", params={"reporter_id": -1}).json()
    assert [t["title"] for t in by_none] == ["Unreported"]

    by_either = client.get("/api/tasks", params=[("reporter_id", reporter["id"]), ("reporter_id", -1)]).json()
    titles = {t["title"] for t in by_either}
    assert titles == {"Reported", "Unreported"}


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


def test_doc_urls_keep_order_skip_blanks_and_can_be_replaced(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task = client.post(
        "/api/tasks",
        json={
            "title": "Documented",
            "column_id": col_id,
            "doc_urls": ["https://wiki/a", "  ", " https://wiki/b "],
        },
    ).json()
    assert task["doc_urls"] == ["https://wiki/a", "https://wiki/b"]

    updated = client.patch(f"/api/tasks/{task['id']}", json={"doc_urls": ["https://wiki/c"]}).json()
    assert updated["doc_urls"] == ["https://wiki/c"]

    cleared = client.patch(f"/api/tasks/{task['id']}", json={"doc_urls": []}).json()
    assert cleared["doc_urls"] == []


def test_patch_with_null_for_required_fields_keeps_existing_values(client, columns_by_name):
    col_id = columns_by_name["New"].id
    task = client.post("/api/tasks", json={"title": "Keep me", "column_id": col_id}).json()

    resp = client.patch(f"/api/tasks/{task['id']}", json={"title": None, "priority_id": None, "notes": "n"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Keep me"
    assert body["priority"]["id"] == task["priority"]["id"]
    assert body["notes"] == "n"


def test_search_treats_percent_and_underscore_literally(client, columns_by_name):
    col_id = columns_by_name["New"].id
    for title in ("100% done", "snake_case", "plain text"):
        client.post("/api/tasks", json={"title": title, "column_id": col_id})

    def titles(term):
        return sorted(t["title"] for t in client.get("/api/tasks", params={"search": term}).json())

    assert titles("%") == ["100% done"]
    assert titles("_") == ["snake_case"]
    assert titles("n_c") == []


def test_filter_by_reporter_and_no_reporter(client, columns_by_name):
    col_id = columns_by_name["New"].id
    reporter = client.post("/api/reporters", json={"name": "Dana"}).json()
    client.post("/api/tasks", json={"title": "Assigned", "column_id": col_id, "reporter_id": reporter["id"]})
    client.post("/api/tasks", json={"title": "Unassigned", "column_id": col_id})

    def titles(*ids):
        resp = client.get("/api/tasks", params={"reporter_id": list(ids)})
        return sorted(t["title"] for t in resp.json())

    assert titles(reporter["id"]) == ["Assigned"]
    assert titles(-1) == ["Unassigned"]
    assert titles(reporter["id"], -1) == ["Assigned", "Unassigned"]


def test_concurrent_creates_never_reuse_a_display_code(engine, db_session, columns_by_name):
    from concurrent.futures import ThreadPoolExecutor

    from sqlalchemy.orm import sessionmaker

    from backend.app.schemas import TaskCreate
    from backend.app.services.task_service import create_task

    col_id = columns_by_name["New"].id
    make_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def create(index):
        with make_session() as session:
            return create_task(session, TaskCreate(title=f"T{index}", column_id=col_id)).display_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        codes = list(pool.map(create, range(16)))

    assert sorted(codes, key=lambda c: int(c.split("-")[1])) == [f"FD-{n}" for n in range(1, 17)]
