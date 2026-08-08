"""First-run seed data: default columns, priorities, and settings."""

from sqlalchemy.orm import Session

from backend.app.models import BoardColumn, Priority, Setting

DEFAULT_COLUMN_EMOJI = {
    "New": "🆕",
    "Analysis": "🔎",
    "In Progress": "🚧",
    "Testing": "🧪",
    "On Hold": "⏸️",
    "Done": "✅",
    "Skipped": "⏭️",
}

# (key, name, emoji, color) — key is the stable id used to migrate legacy data.
DEFAULT_PRIORITIES = [
    ("urgent", "Urgent", "🔥", "#ef4444"),
    ("high", "High", "⚡", "#f97316"),
    ("medium", "Medium", "➖", "#eab308"),
    ("low", "Low", "🧊", "#0ea5e9"),
]

DEFAULT_SETTINGS = {
    "external_reference_base_url": "",
    "next_task_number": "1",
}


def seed_if_empty(db: Session) -> None:
    if db.query(BoardColumn).count() == 0:
        for position, (name, emoji) in enumerate(DEFAULT_COLUMN_EMOJI.items()):
            db.add(BoardColumn(name=name, emoji=emoji, position=position, is_default=True))

    if db.query(Priority).count() == 0:
        for position, (key, name, emoji, color) in enumerate(DEFAULT_PRIORITIES):
            db.add(Priority(key=key, name=name, emoji=emoji, color=color, position=position, is_default=True))

    existing_keys = {row.key for row in db.query(Setting).all()}
    for key, value in DEFAULT_SETTINGS.items():
        if key not in existing_keys:
            db.add(Setting(key=key, value=value))

    db.commit()
