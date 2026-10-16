import atexit
import os
import shutil
import tempfile
from pathlib import Path

TEST_DATABASE_URL = os.environ.get(
    "FLOWDESK_TEST_DATABASE_URL", "postgresql+psycopg://flowdesk:flowdesk@127.0.0.1:54329/flowdesk_test"
)
if "supabase" in TEST_DATABASE_URL:
    raise RuntimeError("Refusing to run the tests against a Supabase database: they wipe every table.")

STORAGE_ROOT = Path(tempfile.mkdtemp(prefix="flowdesk-tests-"))
atexit.register(shutil.rmtree, STORAGE_ROOT, ignore_errors=True)
os.environ.update(
    {
        "DATABASE_URL": TEST_DATABASE_URL,
        "FLOWDESK_STORAGE": "local",
        "FLOWDESK_STORAGE_DIR": str(STORAGE_ROOT),
    }
)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker

from backend.app import config
from backend.app.database import Base, get_db, make_engine
from backend.app.main import app
from backend.app.models import BoardColumn, Priority, TaskType
from backend.app.seed import seed_if_empty

SCHEMA_SQL = config.PROJECT_ROOT / "supabase" / "01_tables.sql"


def apply_schema(engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.exec_driver_sql(SCHEMA_SQL.read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def engine():
    engine = make_engine(TEST_DATABASE_URL)
    try:
        apply_schema(engine)
    except OperationalError as exc:
        pytest.exit(
            "Cannot reach the test PostgreSQL. Start it with "
            "`docker compose -f tests/docker-compose.yml up -d --wait`.\n" + str(exc.orig),
            returncode=2,
        )
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session(engine):
    names = ", ".join(f'"{table.name}"' for table in Base.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {names} RESTART IDENTITY CASCADE"))
    shutil.rmtree(STORAGE_ROOT, ignore_errors=True)
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)

    session = sessionmaker(bind=engine, autoflush=False, autocommit=False)()
    seed_if_empty(session)
    yield session
    session.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def storage_root(db_session):
    return STORAGE_ROOT


@pytest.fixture()
def columns_by_name(db_session):
    return {c.name: c for c in db_session.query(BoardColumn).all()}


@pytest.fixture()
def priorities_by_key(db_session):
    return {p.key: p for p in db_session.query(Priority).all()}


@pytest.fixture()
def task_types_by_key(db_session):
    return {t.key: t for t in db_session.query(TaskType).all()}
