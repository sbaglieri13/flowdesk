import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from backend.app import config, main
from backend.app.database import SchemaError, missing_schema_parts, verify_schema
from tests.backend.conftest import TEST_DATABASE_URL, apply_schema


def test_tests_use_the_test_database_and_local_storage():
    assert config.settings.database_url == TEST_DATABASE_URL
    assert config.settings.storage_backend == "local"
    assert "supabase" not in config.settings.database_url


def test_startup_verifies_the_schema_then_seeds(monkeypatch):
    calls = []

    class FakeSession:
        def close(self):
            calls.append("close")

    monkeypatch.setattr(main, "verify_schema", lambda: calls.append("verify"))
    monkeypatch.setattr(main, "SessionLocal", FakeSession)
    monkeypatch.setattr(main, "seed_if_empty", lambda _db: calls.append("seed"))

    with TestClient(main.app):
        pass

    assert calls == ["verify", "seed", "close"]


def test_schema_created_by_the_sql_script_matches_the_models(engine):
    assert missing_schema_parts(engine) == []
    verify_schema(engine)


def test_verify_schema_names_every_missing_table_and_column(engine):
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE tasks DROP COLUMN closed_at"))
        conn.execute(text("DROP TABLE time_entries"))
    try:
        missing = missing_schema_parts(engine)
        assert "column tasks.closed_at" in missing
        assert "table time_entries" in missing
        with pytest.raises(SchemaError, match="supabase/01_tables.sql"):
            verify_schema(engine)
    finally:
        apply_schema(engine)


def test_verify_schema_on_an_empty_database_gives_a_short_message(engine):
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    try:
        with pytest.raises(SchemaError, match="has no Flowdesk tables yet"):
            verify_schema(engine)
    finally:
        apply_schema(engine)
