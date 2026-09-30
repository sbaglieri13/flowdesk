from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.app import config


class Base(DeclarativeBase):
    pass


def make_engine(db_path):
    return create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )


config.ensure_data_dirs()
engine = make_engine(config.DB_PATH)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def _default_sql_literal(column) -> str | None:
    default = column.default
    if default is None or default.is_callable or default.is_sequence:
        return None
    value = default.arg
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return "'{}'".format(value.replace("'", "''"))
    return None


def _add_missing_columns(bind) -> None:
    inspector = inspect(bind)
    with bind.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if not inspector.has_table(table.name):
                continue
            existing_columns = {col["name"] for col in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_columns:
                    continue
                col_type = column.type.compile(dialect=bind.dialect)
                ddl = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}'
                default_literal = _default_sql_literal(column)
                if default_literal is not None:
                    ddl += f" DEFAULT {default_literal}"
                conn.execute(text(ddl))


def _drop_stale_columns(bind) -> None:
    inspector = inspect(bind)
    with bind.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if not inspector.has_table(table.name):
                continue
            existing_columns = {col["name"] for col in inspector.get_columns(table.name)}
            declared_columns = {column.name for column in table.columns}
            for stale_name in existing_columns - declared_columns:
                conn.execute(text(f'ALTER TABLE "{table.name}" DROP COLUMN "{stale_name}"'))


def _backfill_default_columns(bind) -> None:
    from backend.app.seed import DEFAULT_COLUMN_EMOJI

    inspector = inspect(bind)
    if not inspector.has_table("columns"):
        return
    if "is_default" not in {c["name"] for c in inspector.get_columns("columns")}:
        return
    with bind.begin() as conn:
        conn.execute(text("UPDATE columns SET is_default = 0 WHERE is_default IS NULL"))
        conn.execute(text("UPDATE columns SET is_hidden = 0 WHERE is_hidden IS NULL"))
        for name, emoji in DEFAULT_COLUMN_EMOJI.items():
            conn.execute(
                text("UPDATE columns SET is_default = 1, emoji = COALESCE(emoji, :emoji) WHERE name = :name"),
                {"name": name, "emoji": emoji},
            )


def _mark_default_done_column(bind) -> None:
    from backend.app.seed import DEFAULT_DONE_COLUMNS

    inspector = inspect(bind)
    if not inspector.has_table("columns"):
        return
    if "is_done_state" not in {c["name"] for c in inspector.get_columns("columns")}:
        return
    with bind.begin() as conn:
        conn.execute(text("UPDATE columns SET is_done_state = 0 WHERE is_done_state IS NULL"))
        for name in DEFAULT_DONE_COLUMNS:
            conn.execute(
                text("UPDATE columns SET is_done_state = 1 WHERE name = :name AND is_default = 1"),
                {"name": name},
            )


def _migrate_reporter_text_to_table(bind) -> None:
    inspector = inspect(bind)
    if not inspector.has_table("tasks") or not inspector.has_table("reporters"):
        return
    task_columns = {c["name"] for c in inspector.get_columns("tasks")}
    if "reporter" not in task_columns or "reporter_id" not in task_columns:
        return
    with bind.begin() as conn:
        rows = conn.execute(
            text("SELECT DISTINCT reporter FROM tasks WHERE reporter IS NOT NULL AND trim(reporter) != ''")
        ).fetchall()
        for row in rows:
            name = row.reporter.strip()
            existing = conn.execute(
                text("SELECT id FROM reporters WHERE name = :name"), {"name": name}
            ).first()
            reporter_id = existing.id if existing else None
            if reporter_id is None:
                conn.execute(text("INSERT INTO reporters (name) VALUES (:name)"), {"name": name})
                reporter_id = conn.execute(
                    text("SELECT id FROM reporters WHERE name = :name"), {"name": name}
                ).first().id
            conn.execute(
                text("UPDATE tasks SET reporter_id = :rid WHERE reporter = :name"),
                {"rid": reporter_id, "name": row.reporter},
            )


def _remove_retired_task_types(bind) -> None:
    from backend.app.seed import RETIRED_DEFAULT_TASK_TYPE_KEYS

    inspector = inspect(bind)
    if not inspector.has_table("task_types"):
        return
    with bind.begin() as conn:
        for key in RETIRED_DEFAULT_TASK_TYPE_KEYS:
            row = conn.execute(text("SELECT id FROM task_types WHERE key = :key"), {"key": key}).first()
            if row is None:
                continue
            if inspector.has_table("tasks"):
                conn.execute(
                    text("UPDATE tasks SET type_id = NULL WHERE type_id = :tid"), {"tid": row.id}
                )
            conn.execute(text("DELETE FROM task_types WHERE id = :tid"), {"tid": row.id})


def _backfill_task_closed_at(bind) -> None:
    inspector = inspect(bind)
    if not inspector.has_table("tasks") or not inspector.has_table("columns"):
        return
    if "closed_at" not in {c["name"] for c in inspector.get_columns("tasks")}:
        return
    with bind.begin() as conn:
        conn.execute(
            text(
                "UPDATE tasks SET closed_at = updated_at "
                "WHERE closed_at IS NULL AND column_id IN "
                "(SELECT id FROM columns WHERE is_done_state = 1)"
            )
        )


def _ensure_default_columns(bind) -> None:
    from backend.app.seed import DEFAULT_COLUMN_EMOJI

    inspector = inspect(bind)
    if not inspector.has_table("columns"):
        return
    with bind.begin() as conn:
        existing_names = {row.name for row in conn.execute(text("SELECT name FROM columns")).fetchall()}
        if not existing_names:
            return
        missing = [
            (name, emoji) for name, emoji in DEFAULT_COLUMN_EMOJI.items() if name not in existing_names
        ]
        if not missing:
            return
        max_position = conn.execute(text("SELECT COALESCE(MAX(position), -1) FROM columns")).scalar()
        for offset, (name, emoji) in enumerate(missing, start=1):
            conn.execute(
                text(
                    "INSERT INTO columns (name, emoji, position, is_default, is_hidden) "
                    "VALUES (:name, :emoji, :position, 1, 0)"
                ),
                {"name": name, "emoji": emoji, "position": max_position + offset},
            )


def _backfill_task_priorities(bind) -> None:
    inspector = inspect(bind)
    if not inspector.has_table("tasks"):
        return
    task_columns = {c["name"] for c in inspector.get_columns("tasks")}
    if "priority" not in task_columns or "priority_id" not in task_columns:
        return
    with bind.begin() as conn:
        priority_rows = conn.execute(text("SELECT id, key FROM priorities WHERE key IS NOT NULL")).fetchall()
        key_to_id = {row.key: row.id for row in priority_rows}
        fallback_id = key_to_id.get("medium")
        if fallback_id is None:
            return
        pending = conn.execute(text("SELECT id, priority FROM tasks WHERE priority_id IS NULL")).fetchall()
        for row in pending:
            target_id = key_to_id.get(row.priority, fallback_id)
            conn.execute(
                text("UPDATE tasks SET priority_id = :pid WHERE id = :tid"),
                {"pid": target_id, "tid": row.id},
            )


def prepare_schema(bind=None) -> None:
    target = bind or engine
    Base.metadata.create_all(bind=target)
    _add_missing_columns(target)


def finalize_schema(bind=None) -> None:
    target = bind or engine
    _backfill_default_columns(target)
    _mark_default_done_column(target)
    _ensure_default_columns(target)
    _backfill_task_priorities(target)
    _remove_retired_task_types(target)
    _migrate_reporter_text_to_table(target)
    _backfill_task_closed_at(target)
    _drop_stale_columns(target)


def init_db(bind=None) -> None:
    prepare_schema(bind)
    finalize_schema(bind)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
