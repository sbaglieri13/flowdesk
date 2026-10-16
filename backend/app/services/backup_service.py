import json
import re
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, Table, func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import model_tables
from backend.app.services.storage_service import ObjectNotFound, get_storage

BACKUP_FORMAT = "flowdesk-backup"
BACKUP_FORMAT_VERSION = 1
BACKUP_NAME = re.compile(r"^flowdesk-\d{8}-\d{6}(-\d+)?\.json$")


class InvalidBackupError(ValueError):
    pass


class BackupNotFoundError(ValueError):
    pass


def _to_json_value(value: Any) -> Any:
    if isinstance(value, datetime | date):
        return value.isoformat()
    return value


def _from_json_value(table: Table, column_name: str, value: Any) -> Any:
    if not isinstance(value, str):
        return value
    column_type = table.columns[column_name].type
    try:
        if isinstance(column_type, DateTime):
            return datetime.fromisoformat(value)
        if isinstance(column_type, Date):
            return date.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise InvalidBackupError(f"Invalid date in {table.name}.{column_name}: {value!r}") from exc
    return value


def _check_name(filename: str) -> str:
    if not BACKUP_NAME.match(filename):
        raise BackupNotFoundError(f"Backup file not found: {filename}")
    return filename


def _is_serial(table: Table) -> bool:
    pk = list(table.primary_key.columns)
    return len(pk) == 1 and pk[0].autoincrement in (True, "auto") and pk[0].type.python_type is int


def build_backup(db: Session) -> dict:
    return {
        "format": BACKUP_FORMAT,
        "format_version": BACKUP_FORMAT_VERSION,
        "created_at": datetime.now(UTC).replace(tzinfo=None).isoformat(),
        "tables": {
            table.name: [
                {key: _to_json_value(value) for key, value in row._mapping.items()}
                for row in db.execute(select(table).order_by(*table.primary_key.columns))
            ]
            for table in model_tables()
        },
    }


def _unique_name(existing: set[str]) -> str:
    base = f"flowdesk-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    name, counter = f"{base}.json", 1
    while name in existing:
        name, counter = f"{base}-{counter}.json", counter + 1
    return name


def export_backup(db: Session) -> dict:
    storage = get_storage()
    data = json.dumps(build_backup(db), ensure_ascii=False).encode()
    name = _unique_name({obj.key for obj in storage.list(settings.backups_bucket)})
    storage.put(settings.backups_bucket, name, data, "application/json")
    return {"filename": name, "size_bytes": len(data), "created_at": datetime.now(UTC)}


def list_backups() -> list[dict]:
    objects = [obj for obj in get_storage().list(settings.backups_bucket) if BACKUP_NAME.match(obj.key)]
    return [
        {"filename": obj.key, "size_bytes": obj.size_bytes, "created_at": obj.created_at}
        for obj in sorted(objects, key=lambda obj: obj.key, reverse=True)
    ]


def read_backup(filename: str) -> bytes:
    try:
        return get_storage().get(settings.backups_bucket, _check_name(filename))
    except ObjectNotFound as exc:
        raise BackupNotFoundError(f"Backup file not found: {filename}") from exc


def parse_backup(raw: bytes) -> dict[str, list[dict]]:
    try:
        payload = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise InvalidBackupError("Backup file is not valid JSON") from exc
    if not isinstance(payload, dict) or payload.get("format") != BACKUP_FORMAT:
        raise InvalidBackupError("Backup file is not a Flowdesk backup")
    if payload.get("format_version") != BACKUP_FORMAT_VERSION:
        raise InvalidBackupError(f"Unsupported backup version: {payload.get('format_version')!r}")

    tables = payload.get("tables")
    known = {table.name: table for table in model_tables()}
    if not isinstance(tables, dict) or set(tables) != set(known):
        raise InvalidBackupError("Backup file does not contain the expected tables")

    for name, rows in tables.items():
        table = known[name]
        if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
            raise InvalidBackupError(f"Backup table {name} is malformed")
        required = {c.name for c in table.columns if not c.nullable and c.server_default is None}
        for row in rows:
            unknown = set(row) - set(table.columns.keys())
            if unknown:
                raise InvalidBackupError(f"Backup table {name} has unknown columns: {sorted(unknown)}")
            absent = required - {key for key, value in row.items() if value is not None}
            if absent:
                raise InvalidBackupError(f"Backup table {name} is missing required values: {sorted(absent)}")
    return tables


def reset_sequences(db: Session) -> None:
    for table in model_tables():
        if not _is_serial(table):
            continue
        pk = next(iter(table.primary_key.columns))
        max_id = db.execute(select(func.max(pk))).scalar()
        db.execute(
            text("SELECT setval(pg_get_serial_sequence(:table, :column), :value, :called)"),
            {"table": table.name, "column": pk.name, "value": max_id or 1, "called": max_id is not None},
        )


def insert_rows(db: Session, tables: dict[str, list[dict]]) -> None:
    for table in model_tables():
        rows = [
            {key: _from_json_value(table, key, value) for key, value in row.items()}
            for row in tables.get(table.name, [])
        ]
        if rows:
            db.execute(table.insert(), rows)
    reset_sequences(db)


def restore_rows(db: Session, tables: dict[str, list[dict]]) -> None:
    names = ", ".join(f'"{table.name}"' for table in model_tables())
    try:
        db.execute(text(f"TRUNCATE {names} RESTART IDENTITY CASCADE"))
        insert_rows(db, tables)
        db.commit()
    except InvalidBackupError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        detail = getattr(exc, "orig", None) or exc
        raise InvalidBackupError(f"Backup data is inconsistent: {detail}") from exc


def restore_backup(db: Session, filename: str) -> None:
    restore_rows(db, parse_backup(read_backup(filename)))
