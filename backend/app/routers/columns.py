"""Column (workflow status) CRUD and reordering."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import BoardColumn, Task
from backend.app.schemas import (
    BoardColumnCreate,
    BoardColumnRead,
    BoardColumnReorderRequest,
    BoardColumnUpdate,
)
from backend.app.services.defaults_service import default_column_id
from backend.app.services.position_service import POSITION_GAP, next_task_position

router = APIRouter(prefix="/api/columns", tags=["columns"])


@router.get("", response_model=list[BoardColumnRead])
def list_columns(db: Session = Depends(get_db)):
    return db.query(BoardColumn).order_by(BoardColumn.position).all()


@router.post("", response_model=BoardColumnRead, status_code=201)
def create_column(payload: BoardColumnCreate, db: Session = Depends(get_db)):
    max_position = db.query(func.max(BoardColumn.position)).scalar()
    column = BoardColumn(
        name=payload.name,
        emoji=payload.emoji,
        position=0 if max_position is None else max_position + 1,
    )
    db.add(column)
    db.commit()
    db.refresh(column)
    return column


@router.patch("/reorder", response_model=list[BoardColumnRead])
def reorder_columns(payload: BoardColumnReorderRequest, db: Session = Depends(get_db)):
    columns_by_id = {c.id: c for c in db.query(BoardColumn).all()}
    for item in payload.items:
        column = columns_by_id.get(item.id)
        if column is None:
            raise HTTPException(404, f"Column {item.id} not found")
        column.position = item.position
    db.commit()
    return db.query(BoardColumn).order_by(BoardColumn.position).all()


@router.patch("/{column_id}", response_model=BoardColumnRead)
def update_column(column_id: int, payload: BoardColumnUpdate, db: Session = Depends(get_db)):
    column = db.get(BoardColumn, column_id)
    if column is None:
        raise HTTPException(404, "Column not found")

    data = payload.model_dump(exclude_unset=True)
    if column.is_default:
        # Default columns are permanent fixtures — only visibility can change.
        data = {k: v for k, v in data.items() if k == "is_hidden"}

    for field, value in data.items():
        setattr(column, field, value)
    db.commit()
    db.refresh(column)
    return column


@router.delete("/{column_id}", status_code=204)
def delete_column(column_id: int, db: Session = Depends(get_db)):
    column = db.get(BoardColumn, column_id)
    if column is None:
        raise HTTPException(404, "Column not found")
    if column.is_default:
        raise HTTPException(409, "Default columns can't be deleted — hide them instead")

    # Tasks left behind move to the permanent "New" column rather than
    # blocking the delete — mirrors how removing a tag just detaches it.
    orphaned = db.query(Task).filter(Task.column_id == column_id).all()
    if orphaned:
        try:
            fallback_id = default_column_id(db)
        except ValueError as exc:
            raise HTTPException(500, str(exc)) from exc
        base_position = next_task_position(db, fallback_id)
        for offset, task in enumerate(orphaned):
            task.column_id = fallback_id
            task.position = base_position + offset * POSITION_GAP
        # Flush the reassignment before deleting the column — otherwise both
        # changes land in the same unit-of-work pass and the relationship's
        # cascade logic nulls the just-reassigned column_id back out.
        db.flush()

    db.delete(column)
    db.commit()
