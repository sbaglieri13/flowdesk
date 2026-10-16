from sqlalchemy.orm import Session

from backend.app.models import BoardColumn, Priority, Setting, TaskType

DEFAULT_COLUMN_ICONS = {
    "New": "tray",
    "Analysis": "magnifying-glass",
    "In Progress": "barricade",
    "Testing": "flask",
    "On Hold": "pause-circle",
    "Done": "check-circle",
    "Skipped": "skip-forward",
}

DEFAULT_DONE_COLUMNS = {"Done"}

DEFAULT_PRIORITIES = [
    ("urgent", "Urgent", "fire", "#ef4444"),
    ("high", "High", "lightning", "#f97316"),
    ("medium", "Medium", "minus", "#eab308"),
    ("low", "Low", "snowflake", "#0ea5e9"),
]

DEFAULT_TASK_TYPES = [
    ("bug", "Bug", "bug", "#ef4444"),
    ("feature", "New feature", "sparkle", "#6366f1"),
    ("improvement", "Improvement", "trend-up", "#10b981"),
    ("research", "Research", "magnifying-glass", "#f59e0b"),
]

RETIRED_DEFAULT_TASK_TYPE_KEYS = {"chore"}

DEFAULT_SETTINGS = {
    "external_reference_base_url": "",
    "next_task_number": "1",
}


def seed_if_empty(db: Session) -> None:
    if db.query(BoardColumn).count() == 0:
        for position, (name, icon) in enumerate(DEFAULT_COLUMN_ICONS.items()):
            db.add(
                BoardColumn(
                    name=name,
                    icon=icon,
                    position=position,
                    is_default=True,
                    is_done_state=name in DEFAULT_DONE_COLUMNS,
                )
            )

    if db.query(Priority).count() == 0:
        for position, (key, name, icon, color) in enumerate(DEFAULT_PRIORITIES):
            db.add(Priority(key=key, name=name, icon=icon, color=color, position=position, is_default=True))

    if db.query(TaskType).count() == 0:
        for position, (key, name, icon, color) in enumerate(DEFAULT_TASK_TYPES):
            db.add(TaskType(key=key, name=name, icon=icon, color=color, position=position, is_default=True))

    existing_keys = {row.key for row in db.query(Setting).all()}
    for key, value in DEFAULT_SETTINGS.items():
        if key not in existing_keys:
            db.add(Setting(key=key, value=value))

    db.commit()
