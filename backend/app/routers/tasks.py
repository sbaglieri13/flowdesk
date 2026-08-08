"""Task CRUD, movement, reordering and auto-sort."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Task
from backend.app.schemas import (
    TaskAutoSortRequest,
    TaskCreate,
    TaskMoveRequest,
    TaskRead,
    TaskReorderRequest,
    TaskUpdate,
)
from backend.app.services import task_service
from backend.app.services.settings_service import get_setting

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _to_read(db: Session, task: Task) -> TaskRead:
    base_url = get_setting(db, "external_reference_base_url")
    return TaskRead.from_task(task, base_url)


def _get_task_or_404(db: Session, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    return task


@router.get("", response_model=list[TaskRead])
def list_tasks(
    column_id: int | None = None,
    priority_id: list[int] = Query(default=[]),
    tag_id: list[int] = Query(default=[]),
    search: str | None = None,
    db: Session = Depends(get_db),
):
    tasks = task_service.list_tasks(
        db, column_id=column_id, priority_ids=priority_id, tag_ids=tag_id, search=search
    )
    return [_to_read(db, t) for t in tasks]


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, db: Session = Depends(get_db)):
    return _to_read(db, _get_task_or_404(db, task_id))


@router.post("", response_model=TaskRead, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    try:
        task = task_service.create_task(db, payload)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return _to_read(db, task)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = _get_task_or_404(db, task_id)
    try:
        task = task_service.update_task(db, task, payload)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return _to_read(db, task)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = _get_task_or_404(db, task_id)
    task_service.delete_task(db, task)


@router.post("/reorder", status_code=204)
def reorder_tasks(payload: TaskReorderRequest, db: Session = Depends(get_db)):
    try:
        task_service.reorder_tasks(db, payload.column_id, payload.ordered_task_ids)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/auto-sort", status_code=204)
def auto_sort_tasks(payload: TaskAutoSortRequest, db: Session = Depends(get_db)):
    try:
        task_service.auto_sort_tasks(db, payload.column_id, payload.sort_by)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/{task_id}/move", response_model=TaskRead)
def move_task(task_id: int, payload: TaskMoveRequest, db: Session = Depends(get_db)):
    task = _get_task_or_404(db, task_id)
    try:
        task = task_service.move_task(db, task, payload.column_id, payload.position)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return _to_read(db, task)
