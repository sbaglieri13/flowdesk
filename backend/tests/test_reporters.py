def test_create_list_rename_and_delete_reporter(client, columns_by_name):
    col_id = columns_by_name["New"].id

    reporter = client.post("/api/reporters", json={"name": "Marco Rossi"}).json()
    listed = client.get("/api/reporters").json()
    assert [r["name"] for r in listed] == ["Marco Rossi"]

    renamed = client.patch(f"/api/reporters/{reporter['id']}", json={"name": "Marco B. Rossi"}).json()
    assert renamed["name"] == "Marco B. Rossi"

    task = client.post(
        "/api/tasks", json={"title": "Task", "column_id": col_id, "reporter_id": reporter["id"]}
    ).json()
    assert task["reporter"]["name"] == "Marco B. Rossi"

    resp = client.delete(f"/api/reporters/{reporter['id']}")
    assert resp.status_code == 204

    unassigned = client.get(f"/api/tasks/{task['id']}").json()
    assert unassigned["reporter"] is None


def test_create_reporter_rejects_duplicate_name(client):
    client.post("/api/reporters", json={"name": "Giulia"})
    resp = client.post("/api/reporters", json={"name": "Giulia"})
    assert resp.status_code == 409


def test_create_task_with_unknown_reporter_id_fails(client, columns_by_name):
    col_id = columns_by_name["New"].id
    resp = client.post("/api/tasks", json={"title": "Task", "column_id": col_id, "reporter_id": 9999})
    assert resp.status_code == 400
