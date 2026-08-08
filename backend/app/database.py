"""SQLAlchemy engine/session setup.

The module-level ``engine``/``SessionLocal`` point at the real on-disk
database (``config.DB_PATH``). Tests override the ``get_db`` FastAPI
dependency with a session bound to a temporary database instead, so the
real data file is never touched by the test suite.
"""

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
    """SQL literal for a column's scalar default, if it has one.

    Used so ``ADD COLUMN`` backfills existing rows instead of leaving them
    ``NULL`` — important for non-nullable model fields like the ``bool``
    flags on columns/priorities, which would otherwise fail response
    validation for rows that existed before the field was added.
    """
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
    """Additively patch existing tables so their columns match the models.

    Deliberately simple in place of Alembic (see README design notes): this
    project has one user, one machine, and no deployment pipeline, so a
    diff-and-ALTER-TABLE pass covers the migration shapes we need. Split
    from ``_drop_stale_columns`` so callers can seed/backfill data into a
    freshly-added column before the legacy column it replaced is dropped.
    """
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
    """Drop columns no longer declared on any model (SQLite 3.35+)."""
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
    """Promote pre-existing seed columns to protected defaults.

    Matches on the original seed names; a column the user has since renamed
    away from a default name is treated as an ordinary (fully editable) one
    going forward — this only affects installs from before ``is_default``
    existed.
    """
    from backend.app.seed import DEFAULT_COLUMN_EMOJI  # local import avoids a database<->seed import cycle

    inspector = inspect(bind)
    if not inspector.has_table("columns"):
        return
    if "is_default" not in {c["name"] for c in inspector.get_columns("columns")}:
        return
    with bind.begin() as conn:
        # Repair rows left over from a version of this migration that added
        # is_default/is_hidden without a DEFAULT clause, leaving them NULL
        # instead of false (NULL fails the API's strict bool validation).
        conn.execute(text("UPDATE columns SET is_default = 0 WHERE is_default IS NULL"))
        conn.execute(text("UPDATE columns SET is_hidden = 0 WHERE is_hidden IS NULL"))
        for name, emoji in DEFAULT_COLUMN_EMOJI.items():
            conn.execute(
                text("UPDATE columns SET is_default = 1, emoji = COALESCE(emoji, :emoji) WHERE name = :name"),
                {"name": name, "emoji": emoji},
            )


def _ensure_default_columns(bind) -> None:
    """Insert any default columns added in a later release (e.g. "Analysis")
    that are missing from an existing install's columns table.

    Fresh installs get everything through ``seed_if_empty`` instead — this
    only fires once the table already has rows. New defaults are appended
    after the current max position rather than at their "natural" spot, so
    this never reshuffles a column order the user has already customized.
    """
    from backend.app.seed import DEFAULT_COLUMN_EMOJI  # local import avoids a database<->seed import cycle

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
    """One-time backfill for the legacy ``tasks.priority`` enum column.

    Must run after priorities have been seeded (so ``priorities.key`` rows
    exist to match against) and before ``_drop_stale_columns`` removes the
    legacy column it reads from.
    """
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
    """Create tables and add new columns. Call before seeding default data."""
    target = bind or engine
    Base.metadata.create_all(bind=target)
    _add_missing_columns(target)


def finalize_schema(bind=None) -> None:
    """Backfill data out of legacy columns, then drop them. Call after seeding."""
    target = bind or engine
    _backfill_default_columns(target)
    _ensure_default_columns(target)
    _backfill_task_priorities(target)
    _drop_stale_columns(target)


def init_db(bind=None) -> None:
    """Full schema sync in one call, for callers with no seed step in between."""
    prepare_schema(bind)
    finalize_schema(bind)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
