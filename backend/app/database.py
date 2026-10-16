from collections.abc import Generator

from sqlalchemy import Engine, Table, create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.app.config import SETUP_GUIDE, settings


class Base(DeclarativeBase):
    pass


class SchemaError(RuntimeError):
    pass


def make_engine(url: str) -> Engine:
    return create_engine(
        url,
        pool_pre_ping=True,
        connect_args={"prepare_threshold": None},
    )


engine = make_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def model_tables() -> list[Table]:
    from backend.app import models

    return list(models.Base.metadata.sorted_tables)


def missing_schema_parts(bind: Engine) -> list[str]:
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())
    missing: list[str] = []
    for table in model_tables():
        if table.name not in existing_tables:
            missing.append(f"table {table.name}")
            continue
        existing_columns = {column["name"] for column in inspector.get_columns(table.name)}
        missing += [f"column {table.name}.{c.name}" for c in table.columns if c.name not in existing_columns]
    return missing


def verify_schema(bind: Engine | None = None) -> None:
    missing = missing_schema_parts(bind or engine)
    if not missing:
        return
    if len(missing) == len(model_tables()) and all(m.startswith("table ") for m in missing):
        problem = "The database has no Flowdesk tables yet."
    else:
        problem = "The database is missing " + ", ".join(missing) + "."
    raise SchemaError(f"{problem} Run supabase/01_tables.sql in the Supabase SQL Editor (see {SETUP_GUIDE}).")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
