"""Resolves the permanent fallback column/priority orphaned tasks land on."""

from sqlalchemy.orm import Session

from backend.app.models import BoardColumn, Priority


def default_column_id(db: Session) -> int:
    column = db.query(BoardColumn).filter(BoardColumn.is_default, BoardColumn.name == "New").first()
    if column is None:
        column = db.query(BoardColumn).filter(BoardColumn.is_default).order_by(BoardColumn.position).first()
    if column is None:
        raise ValueError("No default column configured")
    return column.id


def default_priority_id(db: Session) -> int:
    priority = db.query(Priority).filter(Priority.key == "medium").first()
    priority = priority or db.query(Priority).order_by(Priority.position).first()
    if priority is None:
        raise ValueError("No priorities configured")
    return priority.id
