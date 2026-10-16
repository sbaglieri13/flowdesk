from backend.app.models import ChecklistItem, TaskDocLink, TimeEntry


def _create(client, column_id, **fields):
    return client.post("/api/tasks", json={"title": "Task", "column_id": column_id, **fields}).json()


def test_task_created_directly_in_done_column_is_closed(client, columns_by_name):
    task = _create(client, columns_by_name["Done"].id)
    assert task["closed_at"] is not None


def test_moving_between_done_columns_keeps_original_close_time(client, columns_by_name):
    skipped = columns_by_name["Skipped"]
    client.patch(f"/api/columns/{skipped.id}", json={"is_done_state": True})
    task = _create(client, columns_by_name["New"].id)

    closed = client.post(
        f"/api/tasks/{task['id']}/move", json={"column_id": columns_by_name["Done"].id}
    ).json()
    moved = client.post(f"/api/tasks/{task['id']}/move", json={"column_id": skipped.id}).json()
    assert moved["closed_at"] == closed["closed_at"]


def test_new_tasks_go_to_the_bottom_and_move_respects_explicit_position(client, columns_by_name):
    col = columns_by_name["New"].id
    first = _create(client, col)
    second = _create(client, col)
    assert second["position"] > first["position"]

    moved = client.post(
        f"/api/tasks/{second['id']}/move", json={"column_id": columns_by_name["Analysis"].id, "position": 7}
    ).json()
    assert (moved["column_id"], moved["position"]) == (columns_by_name["Analysis"].id, 7)


def test_column_filter_returns_only_that_column(client, columns_by_name):
    _create(client, columns_by_name["New"].id, title="In new")
    _create(client, columns_by_name["Done"].id, title="In done")

    titles = [
        t["title"] for t in client.get("/api/tasks", params={"column_id": columns_by_name["Done"].id}).json()
    ]
    assert titles == ["In done"]


def test_filters_combine_across_categories(client, columns_by_name, priorities_by_key, task_types_by_key):
    col = columns_by_name["New"].id
    urgent = priorities_by_key["urgent"].id
    bug = task_types_by_key["bug"].id
    _create(client, col, title="Urgent bug", priority_id=urgent, type_id=bug)
    _create(client, col, title="Urgent untyped", priority_id=urgent)
    _create(client, col, title="Low bug", priority_id=priorities_by_key["low"].id, type_id=bug)

    result = client.get("/api/tasks", params={"priority_id": urgent, "type_id": bug}).json()
    assert [t["title"] for t in result] == ["Urgent bug"]


def test_search_is_case_insensitive_and_matches_display_code(client, columns_by_name):
    task = _create(client, columns_by_name["New"].id, title="Deploy Pipeline")
    _create(client, columns_by_name["New"].id, title="Something else")

    assert [t["id"] for t in client.get("/api/tasks", params={"search": "deploy pipe"}).json()] == [
        task["id"]
    ]
    assert [t["id"] for t in client.get("/api/tasks", params={"search": task["display_code"]}).json()] == [
        task["id"]
    ]


def test_optional_fields_can_be_cleared(client, columns_by_name, task_types_by_key):
    reporter = client.post("/api/reporters", json={"name": "Ann"}).json()
    task = _create(
        client,
        columns_by_name["New"].id,
        deadline="2026-12-31",
        type_id=task_types_by_key["bug"].id,
        reporter_id=reporter["id"],
        external_reference="PROJ-1",
    )

    cleared = client.patch(
        f"/api/tasks/{task['id']}",
        json={"deadline": None, "type_id": None, "reporter_id": None, "external_reference": None},
    ).json()
    assert (cleared["deadline"], cleared["type"], cleared["reporter"], cleared["external_reference"]) == (
        None,
        None,
        None,
        None,
    )


def test_external_reference_url_is_absent_without_base_url(client, columns_by_name):
    task = _create(client, columns_by_name["New"].id, external_reference="PROJ-9")
    assert task["external_reference_url"] is None


def test_display_codes_are_never_reused(client, columns_by_name):
    col = columns_by_name["New"].id
    first = _create(client, col)
    client.delete(f"/api/tasks/{first['id']}")
    second = _create(client, col)
    assert second["display_code"] != first["display_code"]


def test_blank_initial_checklist_items_are_skipped(client, columns_by_name):
    task = _create(client, columns_by_name["New"].id, checklist_items=["Real", "   ", ""])
    assert [i["text"] for i in task["checklist_items"]] == ["Real"]


def test_rich_text_html_is_stored_verbatim(client, columns_by_name):
    html = (
        '<p>Hello <strong>world</strong> <span style="color: #ef4444">red</span></p>'
        "<ul><li><p>a</p></li></ul>"
    )
    task = _create(client, columns_by_name["New"].id, description=html, notes="<p>n</p>")
    fetched = client.get(f"/api/tasks/{task['id']}").json()
    assert (fetched["description"], fetched["notes"]) == (html, "<p>n</p>")


def test_deleting_task_removes_its_children(client, db_session, columns_by_name):
    task = _create(client, columns_by_name["New"].id, checklist_items=["a"], doc_urls=["https://x"])
    client.post(f"/api/tasks/{task['id']}/time-entries", json={"hours": 1})

    client.delete(f"/api/tasks/{task['id']}")
    db_session.expire_all()
    for model in (ChecklistItem, TimeEntry, TaskDocLink):
        assert db_session.query(model).filter_by(task_id=task["id"]).count() == 0
