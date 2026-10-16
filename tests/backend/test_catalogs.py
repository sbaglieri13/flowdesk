import pytest


def test_tags_are_listed_alphabetically_and_can_be_updated(client):
    zeta = client.post("/api/tags", json={"name": "zeta", "color": "#ef4444"}).json()
    client.post("/api/tags", json={"name": "alpha", "color": "#22c55e", "icon": "rocket-launch"})

    assert [t["name"] for t in client.get("/api/tags").json()] == ["alpha", "zeta"]

    updated = client.patch(f"/api/tags/{zeta['id']}", json={"name": "omega", "color": "#000000"}).json()
    assert (updated["name"], updated["color"]) == ("omega", "#000000")


def test_renaming_tag_to_existing_name_is_rejected(client):
    first = client.post("/api/tags", json={"name": "one", "color": "#111111"}).json()
    client.post("/api/tags", json={"name": "two", "color": "#222222"})

    assert client.patch(f"/api/tags/{first['id']}", json={"name": "two"}).status_code == 409


def test_custom_priority_lifecycle(client, columns_by_name, priorities_by_key):
    created = client.post(
        "/api/priorities", json={"name": "Blocker", "icon": "siren", "color": "#000000"}
    ).json()
    positions = [p["position"] for p in client.get("/api/priorities").json()]
    assert created["position"] == max(positions)
    assert created["is_default"] is False

    renamed = client.patch(f"/api/priorities/{created['id']}", json={"name": "Showstopper"}).json()
    assert renamed["name"] == "Showstopper"
    hidden = client.patch(f"/api/priorities/{created['id']}", json={"is_hidden": True}).json()
    assert hidden["is_hidden"] is True

    task = client.post(
        "/api/tasks",
        json={"title": "T", "column_id": columns_by_name["New"].id, "priority_id": created["id"]},
    ).json()
    assert client.delete(f"/api/priorities/{created['id']}").status_code == 204
    assert client.get(f"/api/tasks/{task['id']}").json()["priority"]["id"] == priorities_by_key["medium"].id


def test_priority_name_conflicts_are_rejected(client):
    assert (
        client.post(
            "/api/priorities", json={"name": "Urgent", "icon": "fire", "color": "#000000"}
        ).status_code
        == 409
    )
    custom = client.post(
        "/api/priorities", json={"name": "Custom", "icon": "star", "color": "#000000"}
    ).json()
    assert client.patch(f"/api/priorities/{custom['id']}", json={"name": "Urgent"}).status_code == 409


def test_default_priority_can_be_hidden(client, priorities_by_key):
    low = priorities_by_key["low"]
    assert client.patch(f"/api/priorities/{low.id}", json={"is_hidden": True}).json()["is_hidden"] is True


def test_new_task_gets_medium_priority_by_default(client, columns_by_name):
    task = client.post("/api/tasks", json={"title": "T", "column_id": columns_by_name["New"].id}).json()
    assert task["priority"]["name"] == "Medium"


def test_custom_task_type_lifecycle(client):
    created = client.post(
        "/api/task-types", json={"name": "Spike", "icon": "test-tube", "color": "#0ea5e9"}
    ).json()
    assert created["is_default"] is False

    renamed = client.patch(f"/api/task-types/{created['id']}", json={"name": "Experiment"}).json()
    assert renamed["name"] == "Experiment"
    assert client.patch(f"/api/task-types/{created['id']}", json={"name": "Bug"}).status_code == 409
    assert (
        client.patch(f"/api/task-types/{created['id']}", json={"is_hidden": True}).json()["is_hidden"] is True
    )


def test_default_task_type_can_be_hidden(client, task_types_by_key):
    bug = task_types_by_key["bug"]
    assert client.patch(f"/api/task-types/{bug.id}", json={"is_hidden": True}).json()["is_hidden"] is True


def test_reporters_are_sorted_and_rename_conflicts_rejected(client):
    bob = client.post("/api/reporters", json={"name": "Bob"}).json()
    client.post("/api/reporters", json={"name": "Alice"})

    assert [r["name"] for r in client.get("/api/reporters").json()] == ["Alice", "Bob"]
    assert client.patch(f"/api/reporters/{bob['id']}", json={"name": "Alice"}).status_code == 409


def test_names_are_trimmed(client):
    assert client.post("/api/reporters", json={"name": "  Carla  "}).json()["name"] == "Carla"
    assert client.post("/api/tags", json={"name": "  ops ", "color": "#111111"}).json()["name"] == "ops"


def test_custom_column_lifecycle(client):
    created = client.post("/api/columns", json={"name": "Blocked", "icon": "barricade"}).json()
    assert created["position"] == max(c["position"] for c in client.get("/api/columns").json())
    assert created["is_default"] is False

    updated = client.patch(
        f"/api/columns/{created['id']}", json={"name": "On hold", "is_hidden": True, "is_done_state": True}
    ).json()
    assert (updated["name"], updated["is_hidden"], updated["is_done_state"]) == ("On hold", True, True)

    assert client.delete(f"/api/columns/{created['id']}").status_code == 204
    assert all(c["id"] != created["id"] for c in client.get("/api/columns").json())


def test_default_column_can_be_hidden(client, columns_by_name):
    column = columns_by_name["Analysis"]
    assert client.patch(f"/api/columns/{column.id}", json={"is_hidden": True}).json()["is_hidden"] is True


def test_settings_round_trip(client):
    assert client.get("/api/settings").json() == {"external_reference_base_url": ""}

    saved = client.put(
        "/api/settings", json={"external_reference_base_url": "https://jira.example.com/browse"}
    )
    assert saved.json()["external_reference_base_url"] == "https://jira.example.com/browse"
    assert (
        client.get("/api/settings").json()["external_reference_base_url"] == "https://jira.example.com/browse"
    )


@pytest.mark.parametrize("name", ["New", "Analysis", "In Progress", "Testing", "On Hold", "Done", "Skipped"])
def test_seeded_columns_exist(columns_by_name, name):
    assert columns_by_name[name].is_default


def test_tags_default_to_the_tag_icon_and_icons_can_be_changed(client):
    tag = client.post("/api/tags", json={"name": "plain", "color": "#111111"}).json()
    assert tag["icon"] == "tag"
    assert client.patch(f"/api/tags/{tag['id']}", json={"icon": "database"}).json()["icon"] == "database"


def test_seeded_catalogs_use_icons(client):
    priorities = {p["name"]: p["icon"] for p in client.get("/api/priorities").json()}
    assert priorities == {"Urgent": "fire", "High": "lightning", "Medium": "minus", "Low": "snowflake"}
    types = {t["name"]: t["icon"] for t in client.get("/api/task-types").json()}
    assert types["Bug"] == "bug"
    columns = {c["name"]: c["icon"] for c in client.get("/api/columns").json()}
    assert columns["Done"] == "check-circle"


def test_custom_colors_are_accepted_and_normalized(client):
    tag = client.post("/api/tags", json={"name": "custom", "color": " #1A2B3C "}).json()
    assert tag["color"] == "#1a2b3c"
    assert client.patch(f"/api/tags/{tag['id']}", json={"color": "#ABCDEF"}).json()["color"] == "#abcdef"
