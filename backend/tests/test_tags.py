def test_deleting_tag_detaches_it_from_tasks(client, columns_by_name):
    col_id = columns_by_name["New"].id
    tag = client.post("/api/tags", json={"name": "backend", "color": "#6366f1"}).json()

    task = client.post(
        "/api/tasks", json={"title": "Tagged task", "column_id": col_id, "tag_ids": [tag["id"]]}
    ).json()
    assert [t["id"] for t in task["tags"]] == [tag["id"]]

    resp = client.delete(f"/api/tags/{tag['id']}")
    assert resp.status_code == 204

    updated = client.get(f"/api/tasks/{task['id']}").json()
    assert updated["tags"] == []


def test_duplicate_tag_name_is_rejected(client):
    client.post("/api/tags", json={"name": "dup", "color": "#ef4444"})
    resp = client.post("/api/tags", json={"name": "dup", "color": "#22c55e"})
    assert resp.status_code == 409
