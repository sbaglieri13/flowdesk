from sqlalchemy.orm import Session

from backend.app.models import BoardColumn, Priority, Setting, TaskType

DEFAULT_COLUMN_EMOJI = {
    "New": "🆕",
    "Analysis": "🔎",
    "In Progress": "🚧",
    "Testing": "🧪",
    "On Hold": "⏸️",
    "Done": "✅",
    "Skipped": "⏭️",
}

DEFAULT_DONE_COLUMNS = {"Done"}

DEFAULT_PRIORITIES = [
    ("urgent", "Urgent", "🔥", "#ef4444"),
    ("high", "High", "⚡", "#f97316"),
    ("medium", "Medium", "➖", "#eab308"),
    ("low", "Low", "🧊", "#0ea5e9"),
]

DEFAULT_TASK_TYPES = [
    ("bug", "Bug", "🐞", "#ef4444"),
    ("feature", "New feature", "✨", "#6366f1"),
    ("improvement", "Improvement", "📈", "#10b981"),
    ("research", "Research", "🔍", "#f59e0b"),
]

RETIRED_DEFAULT_TASK_TYPE_KEYS = {"chore"}

DEFAULT_SETTINGS = {
    "external_reference_base_url": "",
    "next_task_number": "1",
}


def seed_if_empty(db: Session) -> None:
    if db.query(BoardColumn).count() == 0:
        for position, (name, emoji) in enumerate(DEFAULT_COLUMN_EMOJI.items()):
            db.add(
                BoardColumn(
                    name=name,
                    emoji=emoji,
                    position=position,
                    is_default=True,
                    is_done_state=name in DEFAULT_DONE_COLUMNS,
                )
            )

    if db.query(Priority).count() == 0:
        for position, (key, name, emoji, color) in enumerate(DEFAULT_PRIORITIES):
            db.add(Priority(key=key, name=name, emoji=emoji, color=color, position=position, is_default=True))

    if db.query(TaskType).count() == 0:
        for position, (key, name, emoji, color) in enumerate(DEFAULT_TASK_TYPES):
            db.add(TaskType(key=key, name=name, emoji=emoji, color=color, position=position, is_default=True))

    existing_keys = {row.key for row in db.query(Setting).all()}
    for key, value in DEFAULT_SETTINGS.items():
        if key not in existing_keys:
            db.add(Setting(key=key, value=value))

    db.commit()
