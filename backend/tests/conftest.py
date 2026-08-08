"""Shared test fixtures: an isolated temp SQLite db per test, never the real one.

The FastAPI app's own startup event (which initializes/seeds the REAL
database at ``data/flowdesk.db``) is intentionally never triggered here —
we use a plain ``TestClient`` without the ``with`` context manager, which
skips the ASGI lifespan/startup handlers entirely, and instead seed a
temporary engine ourselves.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models import BoardColumn, Priority
from backend.app.seed import seed_if_empty


@pytest.fixture()
def db_session(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSessionLocal()
    seed_if_empty(session)
    yield session
    session.close()
    engine.dispose()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def columns_by_name(db_session):
    return {c.name: c for c in db_session.query(BoardColumn).all()}


@pytest.fixture()
def priorities_by_key(db_session):
    return {p.key: p for p in db_session.query(Priority).all()}
