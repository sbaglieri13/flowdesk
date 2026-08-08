"""Priority level CRUD. Default priorities can be hidden but never renamed or deleted."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Priority, Task
from backend.app.schemas import PriorityCreate, PriorityRead, PriorityUpdate
from backend.app.services.defaults_service import default_priority_id

router = APIRouter(prefix="/api/priorities", tags=["priorities"])

DUPLICATE_NAME_ERROR = "A priority with this name already exists"


@router.get("", response_model=list[PriorityRead])
def list_priorities(db: Session = Depends(get_db)):
    return db.query(Priority).order_by(Priority.position).all()


@router.post("", response_model=PriorityRead, status_code=201)
def create_priority(payload: PriorityCreate, db: Session = Depends(get_db)):
    if db.query(Priority).filter(Priority.name == payload.name).first():
        raise HTTPException(409, DUPLICATE_NAME_ERROR)
    max_position = db.query(func.max(Priority.position)).scalar()
    priority = Priority(
        name=payload.name,
        emoji=payload.emoji,
        color=payload.color,
        position=0 if max_position is None else max_position + 1,
    )
    db.add(priority)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, DUPLICATE_NAME_ERROR) from exc
    db.refresh(priority)
    return priority


@router.patch("/{priority_id}", response_model=PriorityRead)
def update_priority(priority_id: int, payload: PriorityUpdate, db: Session = Depends(get_db)):
    priority = db.get(Priority, priority_id)
    if priority is None:
        raise HTTPException(404, "Priority not found")

    data = payload.model_dump(exclude_unset=True)
    if priority.is_default:
        # Default priorities are permanent fixtures — only visibility can change.
        data = {k: v for k, v in data.items() if k == "is_hidden"}
    if "name" in data:
        name_conflict = (
            db.query(Priority).filter(Priority.name == data["name"], Priority.id != priority_id).first()
        )
        if name_conflict:
            raise HTTPException(409, DUPLICATE_NAME_ERROR)

    for field, value in data.items():
        setattr(priority, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, DUPLICATE_NAME_ERROR) from exc
    db.refresh(priority)
    return priority


@router.delete("/{priority_id}", status_code=204)
def delete_priority(priority_id: int, db: Session = Depends(get_db)):
    priority = db.get(Priority, priority_id)
    if priority is None:
        raise HTTPException(404, "Priority not found")
    if priority.is_default:
        raise HTTPException(409, "Default priorities can't be deleted — hide them instead")

    # Tasks left behind fall back to "Medium" rather than blocking the
    # delete — mirrors how removing a tag just detaches it.
    try:
        fallback_id = default_priority_id(db)
    except ValueError as exc:
        raise HTTPException(500, str(exc)) from exc
    db.query(Task).filter(Task.priority_id == priority_id).update({Task.priority_id: fallback_id})

    db.delete(priority)
    db.commit()
