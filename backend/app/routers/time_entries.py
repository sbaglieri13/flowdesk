from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Task, TimeEntry
from backend.app.schemas import TimeEntryCreate, TimeEntryRead, TimeEntryUpdate

router = APIRouter(prefix="/api/tasks/{task_id}/time-entries", tags=["time-entries"])


def _get_task_or_404(db: Session, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    return task


def _get_entry_or_404(db: Session, task_id: int, entry_id: int) -> TimeEntry:
    entry = db.get(TimeEntry, entry_id)
    if entry is None or entry.task_id != task_id:
        raise HTTPException(404, "Time entry not found")
    return entry


@router.get("", response_model=list[TimeEntryRead])
def list_entries(task_id: int, db: Session = Depends(get_db)):
    _get_task_or_404(db, task_id)
    return (
        db.query(TimeEntry)
        .filter(TimeEntry.task_id == task_id)
        .order_by(TimeEntry.logged_date.desc())
        .all()
    )


@router.post("", response_model=TimeEntryRead, status_code=201)
def create_entry(task_id: int, payload: TimeEntryCreate, db: Session = Depends(get_db)):
    _get_task_or_404(db, task_id)
    entry = TimeEntry(
        task_id=task_id,
        hours=payload.hours,
        note=payload.note,
        logged_date=payload.logged_date or date.today(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/{entry_id}", response_model=TimeEntryRead)
def update_entry(task_id: int, entry_id: int, payload: TimeEntryUpdate, db: Session = Depends(get_db)):
    entry = _get_entry_or_404(db, task_id, entry_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
def delete_entry(task_id: int, entry_id: int, db: Session = Depends(get_db)):
    entry = _get_entry_or_404(db, task_id, entry_id)
    db.delete(entry)
    db.commit()
