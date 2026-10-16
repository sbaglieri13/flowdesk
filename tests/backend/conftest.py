import atexit
import os
import shutil
import sqlite3
import tempfile

os.environ["FLOWDESK_DATA_DIR"] = tempfile.mkdtemp(prefix="flowdesk-tests-")
atexit.register(shutil.rmtree, os.environ["FLOWDESK_DATA_DIR"], ignore_errors=True)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models import BoardColumn, Priority, TaskType
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
def make_database():
    def _make(path, marker: str = "") -> bytes:
        with sqlite3.connect(path) as conn:
            conn.execute("CREATE TABLE columns (id INTEGER PRIMARY KEY)")
            conn.execute("CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT)")
            conn.execute("INSERT INTO tasks (title) VALUES (?)", (marker,))
        conn.close()
        return path.read_bytes()

    return _make


@pytest.fixture()
def columns_by_name(db_session):
    return {c.name: c for c in db_session.query(BoardColumn).all()}


@pytest.fixture()
def priorities_by_key(db_session):
    return {p.key: p for p in db_session.query(Priority).all()}


@pytest.fixture()
def task_types_by_key(db_session):
    return {t.key: t for t in db_session.query(TaskType).all()}
