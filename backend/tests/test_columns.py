def test_list_columns_returns_seeded_defaults(client):
    resp = client.get("/api/columns")
    assert resp.status_code == 200
    names = [c["name"] for c in resp.json()]
    assert names == ["New", "Analysis", "In Progress", "Testing", "On Hold", "Done", "Skipped"]


def test_create_and_rename_column(client):
    created = client.post("/api/columns", json={"name": "Review"}).json()
    assert created["name"] == "Review"

    renamed = client.patch(f"/api/columns/{created['id']}", json={"name": "Code Review"}).json()
    assert renamed["name"] == "Code Review"


def test_reorder_columns(client, columns_by_name):
    new_col = client.post("/api/columns", json={"name": "Extra"}).json()
    resp = client.patch(
        "/api/columns/reorder",
        json={
            "items": [{"id": new_col["id"], "position": 0}, {"id": columns_by_name["New"].id, "position": 1}]
        },
    )
    assert resp.status_code == 200
    ordered = resp.json()
    assert ordered[0]["id"] == new_col["id"]


def test_deleting_column_moves_its_tasks_to_the_default_new_column(client, columns_by_name):
    custom_col_id = client.post("/api/columns", json={"name": "Blocked"}).json()["id"]
    new_col_id = columns_by_name["New"].id

    task = client.post("/api/tasks", json={"title": "Some task", "column_id": custom_col_id}).json()

    resp = client.delete(f"/api/columns/{custom_col_id}")
    assert resp.status_code == 204

    moved = client.get(f"/api/tasks/{task['id']}").json()
    assert moved["column_id"] == new_col_id


def test_done_column_seeded_as_done_state_others_are_not(columns_by_name):
    assert columns_by_name["Done"].is_done_state is True
    assert columns_by_name["New"].is_done_state is False


def test_any_column_can_toggle_done_state(client, columns_by_name):
    new_id = columns_by_name["New"].id
    updated = client.patch(f"/api/columns/{new_id}", json={"is_done_state": True}).json()
    assert updated["is_done_state"] is True


def test_default_column_cannot_be_renamed_or_deleted(client, columns_by_name):
    new_col_id = columns_by_name["New"].id

    renamed = client.patch(f"/api/columns/{new_col_id}", json={"name": "Renamed"}).json()
    assert renamed["name"] == "New"

    hidden = client.patch(f"/api/columns/{new_col_id}", json={"is_hidden": True}).json()
    assert hidden["is_hidden"] is True

    resp = client.delete(f"/api/columns/{new_col_id}")
    assert resp.status_code == 409
