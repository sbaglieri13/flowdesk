def test_default_priority_cannot_be_renamed_or_deleted(client, priorities_by_key):
    urgent_id = priorities_by_key["urgent"].id

    renamed = client.patch(f"/api/priorities/{urgent_id}", json={"name": "Renamed"}).json()
    assert renamed["name"] == "Urgent"

    hidden = client.patch(f"/api/priorities/{urgent_id}", json={"is_hidden": True}).json()
    assert hidden["is_hidden"] is True

    resp = client.delete(f"/api/priorities/{urgent_id}")
    assert resp.status_code == 409


def test_deleting_priority_reassigns_its_tasks_to_medium(client, columns_by_name, priorities_by_key):
    col_id = columns_by_name["New"].id
    medium_id = priorities_by_key["medium"].id
    custom = client.post(
        "/api/priorities", json={"name": "Someday", "emoji": "💤", "color": "#94a3b8"}
    ).json()

    task = client.post(
        "/api/tasks", json={"title": "Low-key task", "column_id": col_id, "priority_id": custom["id"]}
    ).json()

    resp = client.delete(f"/api/priorities/{custom['id']}")
    assert resp.status_code == 204

    moved = client.get(f"/api/tasks/{task['id']}").json()
    assert moved["priority"]["id"] == medium_id
    assert moved["priority"]["name"] == "Medium"
