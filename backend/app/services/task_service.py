from datetime import UTC, datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload, selectinload

from backend.app.models import BoardColumn, ChecklistItem, Priority, Reporter, Tag, Task, TaskType
from backend.app.schemas import TaskCreate, TaskUpdate
from backend.app.services.defaults_service import default_priority_id
from backend.app.services.position_service import next_task_position, reposition_tasks_in_column
from backend.app.services.settings_service import next_task_display_code

NO_TAG_FILTER_ID = -1
NO_TYPE_FILTER_ID = -1
NO_REPORTER_FILTER_ID = -1

_TASK_READ_OPTIONS = (
    joinedload(Task.priority),
    joinedload(Task.type),
    joinedload(Task.reporter),
    selectinload(Task.tags),
    selectinload(Task.checklist_items),
    selectinload(Task.attachments),
    selectinload(Task.time_entries),
)


def _resolve_tags(db: Session, tag_ids: list[int]) -> list[Tag]:
    if not tag_ids:
        return []
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
    found_ids = {t.id for t in tags}
    missing = set(tag_ids) - found_ids
    if missing:
        raise ValueError(f"Unknown tag ids: {sorted(missing)}")
    return tags


def _resolve_priority_id(db: Session, priority_id: int) -> int:
    if db.get(Priority, priority_id) is None:
        raise ValueError(f"Priority {priority_id} not found")
    return priority_id


def _resolve_type_id(db: Session, type_id: int | None) -> int | None:
    if type_id is None:
        return None
    if db.get(TaskType, type_id) is None:
        raise ValueError(f"Task type {type_id} not found")
    return type_id


def _resolve_reporter_id(db: Session, reporter_id: int | None) -> int | None:
    if reporter_id is None:
        return None
    if db.get(Reporter, reporter_id) is None:
        raise ValueError(f"Reporter {reporter_id} not found")
    return reporter_id


def list_tasks(
    db: Session,
    column_id: int | None = None,
    priority_ids: list[int] | None = None,
    tag_ids: list[int] | None = None,
    type_ids: list[int] | None = None,
    reporter_ids: list[int] | None = None,
    search: str | None = None,
) -> list[Task]:
    query = db.query(Task).options(*_TASK_READ_OPTIONS)
    if column_id is not None:
        query = query.filter(Task.column_id == column_id)
    if priority_ids:
        query = query.filter(Task.priority_id.in_(priority_ids))
    if tag_ids:
        real_ids = [t for t in tag_ids if t != NO_TAG_FILTER_ID]
        conditions = []
        if real_ids:
            conditions.append(Task.tags.any(Tag.id.in_(real_ids)))
        if NO_TAG_FILTER_ID in tag_ids:
            conditions.append(~Task.tags.any())
        if conditions:
            query = query.filter(or_(*conditions))
    if type_ids:
        real_ids = [t for t in type_ids if t != NO_TYPE_FILTER_ID]
        conditions = []
        if real_ids:
            conditions.append(Task.type_id.in_(real_ids))
        if NO_TYPE_FILTER_ID in type_ids:
            conditions.append(Task.type_id.is_(None))
        if conditions:
            query = query.filter(or_(*conditions))
    if reporter_ids:
        real_ids = [r for r in reporter_ids if r != NO_REPORTER_FILTER_ID]
        conditions = []
        if real_ids:
            conditions.append(Task.reporter_id.in_(real_ids))
        if NO_REPORTER_FILTER_ID in reporter_ids:
            conditions.append(Task.reporter_id.is_(None))
        if conditions:
            query = query.filter(or_(*conditions))
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Task.title.ilike(like),
                Task.description.ilike(like),
                Task.notes.ilike(like),
                Task.external_reference.ilike(like),
                Task.display_code.ilike(like),
            )
        )
    return query.order_by(Task.column_id, Task.position).all()


def create_task(db: Session, payload: TaskCreate) -> Task:
    column = db.get(BoardColumn, payload.column_id)
    if column is None:
        raise ValueError(f"Column {payload.column_id} not found")

    priority_id = (
        _resolve_priority_id(db, payload.priority_id)
        if payload.priority_id is not None
        else default_priority_id(db)
    )
    type_id = _resolve_type_id(db, payload.type_id)
    reporter_id = _resolve_reporter_id(db, payload.reporter_id)

    task = Task(
        display_code=next_task_display_code(db),
        title=payload.title,
        description=payload.description,
        notes=payload.notes,
        column_id=payload.column_id,
        position=next_task_position(db, payload.column_id),
        priority_id=priority_id,
        type_id=type_id,
        deadline=payload.deadline,
        external_reference=payload.external_reference,
        reporter_id=reporter_id,
        doc_url=payload.doc_url,
        closed_at=datetime.now(UTC).replace(tzinfo=None) if column.is_done_state else None,
        tags=_resolve_tags(db, payload.tag_ids),
    )
    db.add(task)
    db.flush()

    for index, text in enumerate(payload.checklist_items):
        if text.strip():
            db.add(ChecklistItem(task_id=task.id, text=text.strip(), position=index))

    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: Task, payload: TaskUpdate) -> Task:
    data = payload.model_dump(exclude_unset=True)
    if "tag_ids" in data:
        task.tags = _resolve_tags(db, data.pop("tag_ids"))
    if "priority_id" in data:
        data["priority_id"] = _resolve_priority_id(db, data["priority_id"])
    if "type_id" in data:
        data["type_id"] = _resolve_type_id(db, data["type_id"])
    if "reporter_id" in data:
        data["reporter_id"] = _resolve_reporter_id(db, data["reporter_id"])
    for field, value in data.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: Task) -> None:
    from backend.app.services.attachment_service import attachment_file_path

    attachment_paths = [attachment_file_path(a) for a in task.attachments]
    db.delete(task)
    db.commit()
    for path in attachment_paths:
        path.unlink(missing_ok=True)


def move_task(db: Session, task: Task, column_id: int, position: int | None = None) -> Task:
    column = db.get(BoardColumn, column_id)
    if column is None:
        raise ValueError(f"Column {column_id} not found")

    task.column_id = column_id
    task.position = position if position is not None else next_task_position(db, column_id)
    if column.is_done_state:
        if task.closed_at is None:
            task.closed_at = datetime.now(UTC).replace(tzinfo=None)
    else:
        task.closed_at = None

    db.commit()
    db.refresh(task)
    return task


def reorder_tasks(db: Session, column_id: int, ordered_task_ids: list[int]) -> None:
    reposition_tasks_in_column(db, column_id, ordered_task_ids)
    db.commit()


def auto_sort_tasks(db: Session, column_id: int, sort_by: str, order: str | None = None) -> None:
    tasks = db.query(Task).filter(Task.column_id == column_id).all()

    if sort_by == "priority":
        sign = 1 if (order or "desc") == "desc" else -1
        tasks.sort(key=lambda t: (sign * t.priority.position, t.id))
    elif sort_by == "deadline":
        sign = 1 if (order or "asc") == "asc" else -1
        tasks.sort(
            key=lambda t: (t.deadline is None, sign * (t.deadline.toordinal() if t.deadline else 0), t.id)
        )
    else:
        raise ValueError(f"Unknown sort_by: {sort_by}")

    ordered_ids = [t.id for t in tasks]
    reposition_tasks_in_column(db, column_id, ordered_ids)
    db.commit()
