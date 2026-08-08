"""Reading/writing key-value settings, and generating task display codes."""

from sqlalchemy.orm import Session

from backend.app.models import Setting

TASK_CODE_PREFIX = "FD"


def get_settings_dict(db: Session) -> dict[str, str]:
    return {row.key: row.value or "" for row in db.query(Setting).all()}


def get_setting(db: Session, key: str, default: str = "") -> str:
    row = db.get(Setting, key)
    return row.value if row and row.value is not None else default


def set_setting(db: Session, key: str, value: str) -> None:
    row = db.get(Setting, key)
    if row is None:
        db.add(Setting(key=key, value=value))
    else:
        row.value = value


def next_task_display_code(db: Session) -> str:
    current = int(get_setting(db, "next_task_number", "1"))
    set_setting(db, "next_task_number", str(current + 1))
    db.flush()
    return f"{TASK_CODE_PREFIX}-{current}"
