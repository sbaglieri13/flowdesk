"""Helpers for maintaining drag-and-drop ordering with cheap reordering.

Positions are stored with gaps (multiples of ``POSITION_GAP``) so that most
reorders only need to touch the moved row. A full reorder request (drag
settle, or the on-demand auto-sort) simply rewrites all positions in a
column as ``index * POSITION_GAP``.
"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.models import Task

POSITION_GAP = 1000


def next_task_position(db: Session, column_id: int) -> int:
    max_pos = db.query(func.max(Task.position)).filter(Task.column_id == column_id).scalar()
    return 0 if max_pos is None else max_pos + POSITION_GAP


def reposition_tasks_in_column(db: Session, column_id: int, ordered_task_ids: list[int]) -> None:
    tasks_by_id = {t.id: t for t in db.query(Task).filter(Task.id.in_(ordered_task_ids)).all()}
    for index, task_id in enumerate(ordered_task_ids):
        task = tasks_by_id.get(task_id)
        if task is None:
            raise ValueError(f"Task {task_id} not found")
        if task.column_id != column_id:
            raise ValueError(f"Task {task_id} does not belong to column {column_id}")
        task.position = index * POSITION_GAP
