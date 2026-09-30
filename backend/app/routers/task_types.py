from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Task, TaskType
from backend.app.schemas import TaskTypeCreate, TaskTypeRead, TaskTypeUpdate

router = APIRouter(prefix="/api/task-types", tags=["task-types"])

DUPLICATE_NAME_ERROR = "A task type with this name already exists"


@router.get("", response_model=list[TaskTypeRead])
def list_task_types(db: Session = Depends(get_db)):
    return db.query(TaskType).order_by(TaskType.position).all()


@router.post("", response_model=TaskTypeRead, status_code=201)
def create_task_type(payload: TaskTypeCreate, db: Session = Depends(get_db)):
    if db.query(TaskType).filter(TaskType.name == payload.name).first():
        raise HTTPException(409, DUPLICATE_NAME_ERROR)
    max_position = db.query(func.max(TaskType.position)).scalar()
    task_type = TaskType(
        name=payload.name,
        emoji=payload.emoji,
        color=payload.color,
        position=0 if max_position is None else max_position + 1,
    )
    db.add(task_type)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, DUPLICATE_NAME_ERROR) from exc
    db.refresh(task_type)
    return task_type


@router.patch("/{type_id}", response_model=TaskTypeRead)
def update_task_type(type_id: int, payload: TaskTypeUpdate, db: Session = Depends(get_db)):
    task_type = db.get(TaskType, type_id)
    if task_type is None:
        raise HTTPException(404, "Task type not found")

    data = payload.model_dump(exclude_unset=True)
    if task_type.is_default:
        data = {k: v for k, v in data.items() if k == "is_hidden"}
    if "name" in data:
        name_conflict = (
            db.query(TaskType).filter(TaskType.name == data["name"], TaskType.id != type_id).first()
        )
        if name_conflict:
            raise HTTPException(409, DUPLICATE_NAME_ERROR)

    for field, value in data.items():
        setattr(task_type, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, DUPLICATE_NAME_ERROR) from exc
    db.refresh(task_type)
    return task_type


@router.delete("/{type_id}", status_code=204)
def delete_task_type(type_id: int, db: Session = Depends(get_db)):
    task_type = db.get(TaskType, type_id)
    if task_type is None:
        raise HTTPException(404, "Task type not found")
    if task_type.is_default:
        raise HTTPException(409, "Default task types can't be deleted — hide them instead")

    db.query(Task).filter(Task.type_id == type_id).update({Task.type_id: None})

    db.delete(task_type)
    db.commit()
