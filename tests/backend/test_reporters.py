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


def test_list_reporters_includes_task_count(client, columns_by_name):
    col_id = columns_by_name["New"].id
    busy = client.post("/api/reporters", json={"name": "Anna"}).json()
    client.post("/api/reporters", json={"name": "Bruno"})
    for title in ("A", "B"):
        client.post("/api/tasks", json={"title": title, "column_id": col_id, "reporter_id": busy["id"]})

    counts = {r["name"]: r["task_count"] for r in client.get("/api/reporters").json()}
    assert counts == {"Anna": 2, "Bruno": 0}


def test_create_task_with_unknown_reporter_id_fails(client, columns_by_name):
    col_id = columns_by_name["New"].id
    resp = client.post("/api/tasks", json={"title": "Task", "column_id": col_id, "reporter_id": 9999})
    assert resp.status_code == 400


def test_task_count_follows_reassignment_and_deletion(client, columns_by_name):
    col_id = columns_by_name["New"].id
    first = client.post("/api/reporters", json={"name": "First"}).json()
    second = client.post("/api/reporters", json={"name": "Second"}).json()
    assert first["task_count"] == 0

    task = client.post(
        "/api/tasks", json={"title": "T", "column_id": col_id, "reporter_id": first["id"]}
    ).json()

    def counts():
        return {r["name"]: r["task_count"] for r in client.get("/api/reporters").json()}

    assert counts() == {"First": 1, "Second": 0}

    client.patch(f"/api/tasks/{task['id']}", json={"reporter_id": second["id"]})
    assert counts() == {"First": 0, "Second": 1}

    client.delete(f"/api/tasks/{task['id']}")
    assert counts() == {"First": 0, "Second": 0}


def test_rename_returns_updated_task_count(client, columns_by_name):
    col_id = columns_by_name["New"].id
    reporter = client.post("/api/reporters", json={"name": "Old"}).json()
    client.post("/api/tasks", json={"title": "T", "column_id": col_id, "reporter_id": reporter["id"]})

    renamed = client.patch(f"/api/reporters/{reporter['id']}", json={"name": "New"}).json()

    assert renamed["name"] == "New"
    assert renamed["task_count"] == 1


def test_rename_to_existing_name_is_rejected(client):
    client.post("/api/reporters", json={"name": "Taken"})
    other = client.post("/api/reporters", json={"name": "Other"}).json()

    resp = client.patch(f"/api/reporters/{other['id']}", json={"name": "Taken"})

    assert resp.status_code == 409


def test_rename_or_delete_unknown_reporter_returns_404(client):
    assert client.patch("/api/reporters/9999", json={"name": "X"}).status_code == 404
    assert client.delete("/api/reporters/9999").status_code == 404
