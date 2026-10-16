from datetime import date, datetime

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from backend.app.database import Base
from backend.app.models import (
    Attachment,
    BoardColumn,
    ChecklistItem,
    Priority,
    Reporter,
    Setting,
    Tag,
    Task,
    TaskDocLink,
    TimeEntry,
)
from backend.app.services.storage_service import LocalStorage
from scripts import migrate_sqlite_to_supabase as migration
from scripts.migrate_sqlite_to_supabase import MigrationError, migrate


@pytest.fixture()
def legacy(tmp_path):
    sqlite_path = tmp_path / "flowdesk.db"
    attachments_dir = tmp_path / "attachments"
    attachments_dir.mkdir()
    engine = create_engine(f"sqlite:///{sqlite_path.as_posix()}")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        column = BoardColumn(id=5, name="Doing", icon="barricade", position=0, is_done_state=False)
        done = BoardColumn(id=9, name="Done", icon="check-circle", position=1, is_done_state=True)
        priority = Priority(id=3, key="high", name="High", icon="lightning", color="#f97316")
        reporter = Reporter(id=7, name="Ann")
        tag = Tag(id=4, name="ops", color="#123456", icon="tag")
        task = Task(
            id=42,
            display_code="FD-42",
            title="Legacy task",
            description="<p>Hello</p>",
            column=done,
            priority=priority,
            reporter=reporter,
            tags=[tag],
            deadline=date(2026, 5, 1),
            closed_at=datetime(2026, 4, 2, 10, 30),
        )
        session.add_all([column, task])
        session.flush()
        session.add_all(
            [
                TaskDocLink(task_id=42, url="https://wiki/x", position=0),
                ChecklistItem(task_id=42, text="step", is_done=True, position=0),
                TimeEntry(task_id=42, hours=2.25, logged_date=date(2026, 4, 1)),
                Attachment(task_id=42, filename="a.txt", stored_name="abc.txt", size_bytes=5),
                Attachment(task_id=42, filename="gone.txt", stored_name="gone.txt", size_bytes=1),
                Setting(key="next_task_number", value="43"),
            ]
        )
        session.commit()
    engine.dispose()
    (attachments_dir / "abc.txt").write_bytes(b"hello")
    return sqlite_path, attachments_dir


def test_migration_copies_every_row_and_file_keeping_ids(legacy, db_session, tmp_path, client):
    sqlite_path, attachments_dir = legacy
    storage = LocalStorage(tmp_path / "remote")
    logs = []

    counts = migrate(sqlite_path, attachments_dir, db_session, storage, "attachments", log=logs.append)

    assert counts["tasks"] == 1 and counts["attachments"] == 2
    assert storage.get("attachments", "abc.txt") == b"hello"
    assert any("1 attachment file(s) not found" in line for line in logs)
    assert logs[-1] == "Migration complete: every row count matches."

    task = db_session.get(Task, 42)
    assert task.display_code == "FD-42"
    assert task.column.name == "Done" and task.reporter.name == "Ann"
    assert [t.name for t in task.tags] == ["ops"]
    assert task.closed_at == datetime(2026, 4, 2, 10, 30)
    assert task.checklist_items[0].is_done is True
    assert task.time_entries[0].hours == 2.25
    assert db_session.query(BoardColumn).count() == 2

    created = client.post("/api/tasks", json={"title": "New", "column_id": 5}).json()
    assert created["id"] == 43
    assert created["display_code"] == "FD-43"
    assert client.post("/api/reporters", json={"name": "Bob"}).json()["id"] == 8


def test_dry_run_writes_nothing(legacy, db_session, tmp_path):
    sqlite_path, attachments_dir = legacy
    storage = LocalStorage(tmp_path / "remote")

    migrate(
        sqlite_path, attachments_dir, db_session, storage, "attachments", dry_run=True, log=lambda _l: None
    )

    assert db_session.query(Task).count() == 0
    assert storage.list("attachments") == []


def test_existing_data_is_protected_unless_forced(legacy, db_session, tmp_path, client, columns_by_name):
    sqlite_path, attachments_dir = legacy
    client.post("/api/tasks", json={"title": "Already here", "column_id": columns_by_name["New"].id})
    storage = LocalStorage(tmp_path / "remote")

    with pytest.raises(MigrationError, match="--force"):
        migrate(sqlite_path, attachments_dir, db_session, storage, "attachments", log=lambda _l: None)
    assert [t.title for t in db_session.query(Task)] == ["Already here"]

    migrate(sqlite_path, attachments_dir, db_session, storage, "attachments", force=True, log=lambda _l: None)
    assert [t.title for t in db_session.query(Task)] == ["Legacy task"]


def test_a_seeded_but_empty_target_needs_no_force(legacy, db_session, tmp_path):
    sqlite_path, attachments_dir = legacy
    assert db_session.query(BoardColumn).count() > 0

    migrate(
        sqlite_path,
        attachments_dir,
        db_session,
        LocalStorage(tmp_path / "r"),
        "attachments",
        log=lambda _l: None,
    )

    assert {c.name for c in db_session.query(BoardColumn)} == {"Doing", "Done"}


def test_older_sqlite_schemas_are_rejected_with_upgrade_advice(legacy, db_session, tmp_path):
    sqlite_path, attachments_dir = legacy
    engine = create_engine(f"sqlite:///{sqlite_path.as_posix()}")
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE task_doc_links"))
        conn.execute(text("ALTER TABLE tasks DROP COLUMN closed_at"))
    engine.dispose()

    with pytest.raises(MigrationError, match="v1.3") as excinfo:
        migrate(sqlite_path, attachments_dir, db_session, LocalStorage(tmp_path / "r"), "attachments")
    assert "task_doc_links" in str(excinfo.value)
    assert "tasks.closed_at" in str(excinfo.value)


def test_missing_sqlite_file_is_reported(db_session, tmp_path):
    with pytest.raises(MigrationError, match="not found"):
        migrate(tmp_path / "nope.db", tmp_path, db_session, LocalStorage(tmp_path), "attachments")


def test_cli_reports_errors_and_exit_code(tmp_path, capsys, db_session):
    assert migration.main(["--sqlite", str(tmp_path / "nope.db")]) == 1
    assert "SQLite database not found" in capsys.readouterr().err


def test_cli_imports_into_the_configured_database(legacy, db_session, capsys):
    sqlite_path, attachments_dir = legacy

    code = migration.main(["--sqlite", str(sqlite_path), "--attachments", str(attachments_dir)])

    assert code == 0
    assert "Migration complete" in capsys.readouterr().out
    db_session.expire_all()
    assert db_session.get(Task, 42).title == "Legacy task"


def test_cli_reports_database_errors_without_a_traceback(legacy, monkeypatch, capsys):
    from sqlalchemy.exc import OperationalError

    from backend.app import database

    def unreachable(*_args, **_kwargs):
        raise OperationalError("SELECT 1", {}, Exception("password authentication failed"))

    monkeypatch.setattr(database, "verify_schema", unreachable)
    sqlite_path, attachments_dir = legacy

    assert migration.main(["--sqlite", str(sqlite_path), "--attachments", str(attachments_dir)]) == 1
    assert "Database error: password authentication failed" in capsys.readouterr().err
