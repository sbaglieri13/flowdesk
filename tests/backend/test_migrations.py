from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from backend.app.database import Base, finalize_schema
from backend.app.models import BoardColumn, Priority, Task
from backend.app.seed import seed_if_empty


def test_legacy_doc_url_moves_into_doc_links(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    Base.metadata.create_all(bind=engine)
    with Session(engine) as session:
        seed_if_empty(session)
        column_id = session.query(BoardColumn).first().id
        priority_id = session.query(Priority).first().id
        for code, title in (("FD-1", "With link"), ("FD-2", "Without link")):
            session.add(Task(display_code=code, title=title, column_id=column_id, priority_id=priority_id))
        session.commit()

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE tasks ADD COLUMN doc_url VARCHAR(500)"))
        conn.execute(text("UPDATE tasks SET doc_url = ' https://wiki/page ' WHERE display_code = 'FD-1'"))

    finalize_schema(engine)

    with engine.connect() as conn:
        links = conn.execute(
            text("SELECT t.display_code, l.url FROM task_doc_links l JOIN tasks t ON t.id = l.task_id")
        ).fetchall()
        task_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(tasks)"))}
    assert [tuple(r) for r in links] == [("FD-1", "https://wiki/page")]
    assert "doc_url" not in task_columns
    engine.dispose()


def test_markdown_text_is_converted_to_html_once(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    Base.metadata.create_all(bind=engine)
    with Session(engine) as session:
        seed_if_empty(session)
        column_id = session.query(BoardColumn).first().id
        priority_id = session.query(Priority).first().id
        session.add(
            Task(
                display_code="FD-1",
                title="Legacy",
                column_id=column_id,
                priority_id=priority_id,
                description='Line one\nline **two**\n- item\n\n<span style="color: #ef4444">red</span>',
                notes=None,
            )
        )
        session.commit()

    finalize_schema(engine)
    finalize_schema(engine)

    with engine.connect() as conn:
        description, notes = conn.execute(text("SELECT description, notes FROM tasks")).one()
    assert description == (
        "<p>Line one<br>line <strong>two</strong></p><ul><li>item</li></ul>"
        '<p><span style="color: #ef4444">red</span></p>'
    )
    assert notes is None
    engine.dispose()


def _legacy_engine(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    Base.metadata.create_all(
        bind=engine, tables=[t for t in Base.metadata.sorted_tables if t.name != "tasks"]
    )
    with Session(engine) as session:
        seed_if_empty(session)
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE tasks (id INTEGER PRIMARY KEY, display_code VARCHAR(20) UNIQUE NOT NULL, "
                "title VARCHAR(200) NOT NULL, description TEXT, notes TEXT, column_id INTEGER NOT NULL, "
                "position INTEGER NOT NULL DEFAULT 0, deadline DATE, external_reference VARCHAR(100), "
                "priority VARCHAR(20), reporter VARCHAR(100), doc_url VARCHAR(500), "
                "created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, "
                "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL)"
            )
        )
    return engine


def test_database_from_an_old_version_is_fully_upgraded(tmp_path):
    from backend.app.database import prepare_schema

    engine = _legacy_engine(tmp_path)
    with engine.begin() as conn:
        columns = {r.name: r.id for r in conn.execute(text("SELECT id, name FROM columns"))}
        conn.execute(
            text(
                "INSERT INTO tasks "
                "(display_code, title, column_id, priority, reporter, doc_url, description) "
                "VALUES ('FD-1', 'Old urgent', :new, 'urgent', 'Anna', 'https://wiki/1', '**bold**'), "
                "('FD-2', 'Old unknown', :done, 'weird', ' Anna', NULL, NULL), "
                "('FD-3', 'Old none', :new, NULL, '', '', NULL)"
            ),
            {"new": columns["New"], "done": columns["Done"]},
        )

    prepare_schema(engine)
    finalize_schema(engine)

    with engine.connect() as conn:
        task_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(tasks)"))}
        rows = conn.execute(
            text(
                "SELECT t.display_code, p.key AS priority, r.name AS reporter, t.closed_at, t.description "
                "FROM tasks t JOIN priorities p ON p.id = t.priority_id "
                "LEFT JOIN reporters r ON r.id = t.reporter_id ORDER BY t.display_code"
            )
        ).fetchall()
        reporters = [r.name for r in conn.execute(text("SELECT name FROM reporters"))]
        links = conn.execute(text("SELECT url FROM task_doc_links")).fetchall()
    engine.dispose()

    assert {"priority", "reporter", "doc_url"}.isdisjoint(task_columns)
    assert {"priority_id", "type_id", "reporter_id", "closed_at"} <= task_columns
    by_code = {r.display_code: r for r in rows}
    assert by_code["FD-1"].priority == "urgent"
    assert by_code["FD-2"].priority == "medium"
    assert by_code["FD-3"].priority == "medium"
    assert reporters == ["Anna"]
    assert by_code["FD-1"].reporter == by_code["FD-2"].reporter == "Anna"
    assert by_code["FD-3"].reporter is None
    assert by_code["FD-2"].closed_at is not None
    assert by_code["FD-1"].closed_at is None
    assert by_code["FD-1"].description == "<p><strong>bold</strong></p>"
    assert [tuple(r) for r in links] == [("https://wiki/1",)]


def test_retired_chore_type_is_removed_and_its_tasks_unassigned(tmp_path):
    from backend.app.models import TaskType

    engine = create_engine(f"sqlite:///{tmp_path / 'chore.db'}")
    Base.metadata.create_all(bind=engine)
    with Session(engine) as session:
        seed_if_empty(session)
        chore = TaskType(key="chore", name="Chore", icon="broom", color="#64748b", is_default=True)
        session.add(chore)
        session.flush()
        column_id = session.query(BoardColumn).first().id
        priority_id = session.query(Priority).first().id
        session.add(
            Task(
                display_code="FD-1", title="T", column_id=column_id, priority_id=priority_id, type_id=chore.id
            )
        )
        session.commit()

    finalize_schema(engine)

    with engine.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM task_types WHERE key = 'chore'")).scalar() == 0
        assert conn.execute(text("SELECT type_id FROM tasks")).scalar() is None
    engine.dispose()


def test_missing_default_columns_are_restored_and_done_is_flagged(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'cols.db'}")
    Base.metadata.create_all(bind=engine)
    with Session(engine) as session:
        seed_if_empty(session)
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM columns WHERE name = 'Skipped'"))
        conn.execute(text("UPDATE columns SET is_done_state = 0"))

    finalize_schema(engine)

    with engine.connect() as conn:
        names = {r.name for r in conn.execute(text("SELECT name FROM columns"))}
        done_flags = {
            r.name: r.is_done_state for r in conn.execute(text("SELECT name, is_done_state FROM columns"))
        }
    engine.dispose()
    assert "Skipped" in names
    assert done_flags["Done"] == 1
    assert done_flags["New"] == 0


def test_markdown_to_html_matches_the_old_preview_rendering():
    from backend.app.database import markdown_to_html

    assert markdown_to_html("1. one\n2. two") == "<ol><li>one</li><li>two</li></ol>"
    assert markdown_to_html("*it* <u>under</u> `code`") == "<p><em>it</em> <u>under</u> <code>code</code></p>"


def test_emoji_are_converted_to_icons_and_the_emoji_column_is_dropped(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'emoji.db'}")
    Base.metadata.create_all(bind=engine)
    with Session(engine) as session:
        seed_if_empty(session)
    with engine.begin() as conn:
        for table in ("columns", "tags", "priorities", "task_types"):
            conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN emoji VARCHAR(8)'))
        conn.execute(text("UPDATE priorities SET emoji = '🔥' WHERE key = 'urgent'"))
        conn.execute(text("UPDATE priorities SET emoji = '🦄' WHERE key = 'low'"))
        conn.execute(text("UPDATE task_types SET emoji = '🐞' WHERE key = 'bug'"))
        conn.execute(text("UPDATE columns SET emoji = '⏸️' WHERE name = 'Done'"))
        conn.execute(text("UPDATE columns SET emoji = NULL, icon = NULL WHERE name = 'New'"))
        conn.execute(
            text(
                "INSERT INTO tags (name, color, icon, emoji) "
                "VALUES ('ops', '#000', 'tag', '📦'), ('misc', '#000', 'tag', NULL)"
            )
        )

    finalize_schema(engine)

    with engine.connect() as conn:

        def icons(query):
            return dict(conn.execute(text(query)).fetchall())

        priorities = icons("SELECT key, icon FROM priorities")
        types = icons("SELECT key, icon FROM task_types")
        columns = icons("SELECT name, icon FROM columns")
        tags = icons("SELECT name, icon FROM tags")
        leftovers = [
            t
            for t in ("columns", "tags", "priorities", "task_types")
            if "emoji" in {row[1] for row in conn.execute(text(f'PRAGMA table_info("{t}")'))}
        ]
    engine.dispose()

    assert priorities["urgent"] == "fire"
    assert priorities["low"] == "minus"
    assert types["bug"] == "bug"
    assert columns["Done"] == "pause-circle"
    assert columns["New"] == "tray"
    assert tags == {"ops": "package", "misc": "tag"}
    assert leftovers == []
