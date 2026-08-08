"""Checklist item CRUD, reordering and toggling, nested under a task."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import ChecklistItem, Task
from backend.app.schemas import (
    ChecklistItemCreate,
    ChecklistItemRead,
    ChecklistItemUpdate,
    ChecklistReorderRequest,
)

router = APIRouter(prefix="/api/tasks/{task_id}/checklist", tags=["checklist"])


def _get_task_or_404(db: Session, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    return task


def _get_item_or_404(db: Session, task_id: int, item_id: int) -> ChecklistItem:
    item = db.get(ChecklistItem, item_id)
    if item is None or item.task_id != task_id:
        raise HTTPException(404, "Checklist item not found")
    return item


@router.get("", response_model=list[ChecklistItemRead])
def list_items(task_id: int, db: Session = Depends(get_db)):
    _get_task_or_404(db, task_id)
    return (
        db.query(ChecklistItem)
        .filter(ChecklistItem.task_id == task_id)
        .order_by(ChecklistItem.position)
        .all()
    )


@router.post("", response_model=ChecklistItemRead, status_code=201)
def create_item(task_id: int, payload: ChecklistItemCreate, db: Session = Depends(get_db)):
    _get_task_or_404(db, task_id)
    max_position = (
        db.query(func.max(ChecklistItem.position)).filter(ChecklistItem.task_id == task_id).scalar()
    )
    item = ChecklistItem(
        task_id=task_id,
        text=payload.text,
        position=0 if max_position is None else max_position + 1,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/reorder", response_model=list[ChecklistItemRead])
def reorder_items(task_id: int, payload: ChecklistReorderRequest, db: Session = Depends(get_db)):
    _get_task_or_404(db, task_id)
    items_by_id = {i.id: i for i in db.query(ChecklistItem).filter(ChecklistItem.task_id == task_id).all()}
    for index, item_id in enumerate(payload.ordered_item_ids):
        item = items_by_id.get(item_id)
        if item is None:
            raise HTTPException(400, f"Checklist item {item_id} does not belong to task {task_id}")
        item.position = index
    db.commit()
    return (
        db.query(ChecklistItem)
        .filter(ChecklistItem.task_id == task_id)
        .order_by(ChecklistItem.position)
        .all()
    )


@router.patch("/{item_id}", response_model=ChecklistItemRead)
def update_item(task_id: int, item_id: int, payload: ChecklistItemUpdate, db: Session = Depends(get_db)):
    item = _get_item_or_404(db, task_id, item_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.post("/{item_id}/toggle", response_model=ChecklistItemRead)
def toggle_item(task_id: int, item_id: int, db: Session = Depends(get_db)):
    item = _get_item_or_404(db, task_id, item_id)
    item.is_done = not item.is_done
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_item(task_id: int, item_id: int, db: Session = Depends(get_db)):
    item = _get_item_or_404(db, task_id, item_id)
    db.delete(item)
    db.commit()
