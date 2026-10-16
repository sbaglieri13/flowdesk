from pathlib import Path

from fastapi.testclient import TestClient

from backend.app import config, main


def test_tests_never_use_the_real_data_folder():
    assert config.DATA_DIR != config.PROJECT_ROOT / "data"
    assert not Path(config.DB_PATH).is_relative_to(config.PROJECT_ROOT / "data")


def test_startup_prepares_seeds_and_migrates_in_order(monkeypatch):
    calls = []

    class FakeSession:
        def close(self):
            calls.append("close")

    monkeypatch.setattr(main.config, "ensure_data_dirs", lambda: calls.append("dirs"))
    monkeypatch.setattr(main, "prepare_schema", lambda: calls.append("prepare"))
    monkeypatch.setattr(main, "SessionLocal", FakeSession)
    monkeypatch.setattr(main, "seed_if_empty", lambda _db: calls.append("seed"))
    monkeypatch.setattr(main, "finalize_schema", lambda: calls.append("finalize"))

    with TestClient(main.app):
        pass

    assert calls == ["dirs", "prepare", "seed", "close", "finalize"]


def test_every_api_router_is_mounted():
    paths = {route.path for route in main.app.routes}
    for prefix in (
        "/api/columns",
        "/api/tasks",
        "/api/tags",
        "/api/priorities",
        "/api/task-types",
        "/api/reporters",
        "/api/settings",
        "/api/stats/overview",
        "/api/backup/export",
    ):
        assert any(p.startswith(prefix) for p in paths), prefix
