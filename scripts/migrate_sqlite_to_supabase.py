"""Copy a Flowdesk 1.x SQLite database and its attachment files into Supabase.

Usage (from the project root, with .env filled in):
    python -m scripts.migrate_sqlite_to_supabase --sqlite data/flowdesk.db --attachments data/attachments
"""

import argparse
import sys
from collections.abc import Callable
from pathlib import Path

from sqlalchemy import create_engine, func, inspect, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.database import model_tables
from backend.app.models import Reporter, Tag, Task
from backend.app.services.backup_service import InvalidBackupError, restore_rows
from backend.app.services.storage_service import Storage

USER_DATA_MODELS = (Task, Tag, Reporter)


class MigrationError(RuntimeError):
    pass


def read_sqlite(sqlite_path: Path) -> dict[str, list[dict]]:
    if not sqlite_path.is_file():
        raise MigrationError(f"SQLite database not found: {sqlite_path}")
    engine = create_engine(f"sqlite:///{sqlite_path.as_posix()}")
    try:
        inspector = inspect(engine)
        missing = []
        for table in model_tables():
            if not inspector.has_table(table.name):
                missing.append(table.name)
                continue
            present = {c["name"] for c in inspector.get_columns(table.name)}
            missing += [f"{table.name}.{c.name}" for c in table.columns if c.name not in present]
        if missing:
            raise MigrationError(
                "The SQLite database is from an older Flowdesk version (missing "
                + ", ".join(missing)
                + "). Open it once with Flowdesk v1.3 to upgrade it, then run this script again."
            )
        with engine.connect() as conn:
            return {
                table.name: [dict(row._mapping) for row in conn.execute(select(table))]
                for table in model_tables()
            }
    finally:
        engine.dispose()


def target_has_user_data(db: Session) -> bool:
    return any(db.query(model).limit(1).count() for model in USER_DATA_MODELS)


def migrate(
    sqlite_path: Path,
    attachments_dir: Path,
    db: Session,
    storage: Storage,
    attachments_bucket: str,
    *,
    force: bool = False,
    dry_run: bool = False,
    log: Callable[[str], None] = print,
) -> dict[str, int]:
    tables = read_sqlite(sqlite_path)
    counts = {name: len(rows) for name, rows in tables.items()}
    for name, count in counts.items():
        log(f"  {name}: {count} rows")

    files = [(row["stored_name"], attachments_dir / row["stored_name"]) for row in tables["attachments"]]
    missing_files = [name for name, path in files if not path.is_file()]
    if missing_files:
        log(f"  warning: {len(missing_files)} attachment file(s) not found, they will be unavailable")

    if dry_run:
        log("Dry run: nothing was written.")
        return counts

    if target_has_user_data(db) and not force:
        raise MigrationError(
            "The Supabase database already contains Flowdesk data. "
            "Run again with --force to replace it with the SQLite data."
        )

    uploaded = 0
    for stored_name, path in files:
        if path.is_file():
            storage.put(attachments_bucket, stored_name, path.read_bytes())
            uploaded += 1
    log(f"  uploaded {uploaded} attachment file(s)")

    try:
        restore_rows(db, tables)
    except InvalidBackupError as exc:
        raise MigrationError(str(exc)) from exc

    for table in model_tables():
        written = db.execute(select(func.count()).select_from(table)).scalar()
        if written != counts[table.name]:
            raise MigrationError(f"Row count mismatch for {table.name}: {written} != {counts[table.name]}")
    log("Migration complete: every row count matches.")
    return counts


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--sqlite", type=Path, default=Path("data/flowdesk.db"), help="SQLite file to import")
    parser.add_argument(
        "--attachments", type=Path, default=Path("data/attachments"), help="folder with the attachment files"
    )
    parser.add_argument("--dry-run", action="store_true", help="only report what would be imported")
    parser.add_argument("--force", action="store_true", help="replace data already in Supabase")
    args = parser.parse_args(argv)

    try:
        from backend.app.config import settings
        from backend.app.database import SessionLocal, verify_schema
        from backend.app.services.storage_service import get_storage

        verify_schema()
        print(f"Importing {args.sqlite} into {settings.database_url.split('@')[-1]}")
        with SessionLocal() as db:
            migrate(
                args.sqlite,
                args.attachments,
                db,
                get_storage(),
                settings.attachments_bucket,
                force=args.force,
                dry_run=args.dry_run,
            )
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except SQLAlchemyError as exc:
        print(f"Database error: {getattr(exc, 'orig', None) or exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
