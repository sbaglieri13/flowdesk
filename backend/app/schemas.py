from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class BoardColumnCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    emoji: str | None = Field(default=None, max_length=8)


class BoardColumnUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=100)
    emoji: str | None = None
    is_hidden: bool | None = None
    is_done_state: bool | None = None


class BoardColumnRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    emoji: str | None
    position: int
    is_default: bool
    is_hidden: bool
    is_done_state: bool
    created_at: datetime
    updated_at: datetime


class BoardColumnReorderItem(BaseModel):
    id: int
    position: int


class BoardColumnReorderRequest(BaseModel):
    items: list[BoardColumnReorderItem]


class TagCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=50)
    color: str
    emoji: str | None = Field(default=None, max_length=8)


class TagUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=50)
    color: str | None = None
    emoji: str | None = None


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str
    emoji: str | None


class ReporterCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)


class ReporterUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)


class ReporterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class PriorityCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=50)
    emoji: str = Field(min_length=1, max_length=8)
    color: str


class PriorityUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=50)
    emoji: str | None = Field(default=None, min_length=1, max_length=8)
    color: str | None = None
    is_hidden: bool | None = None


class PriorityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    emoji: str
    color: str
    position: int
    is_default: bool
    is_hidden: bool


class TaskTypeCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=50)
    emoji: str = Field(min_length=1, max_length=8)
    color: str


class TaskTypeUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=50)
    emoji: str | None = Field(default=None, min_length=1, max_length=8)
    color: str | None = None
    is_hidden: bool | None = None


class TaskTypeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    emoji: str
    color: str
    position: int
    is_default: bool
    is_hidden: bool


class ChecklistItemCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    text: str = Field(min_length=1, max_length=2000)


class ChecklistItemUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    text: str | None = Field(default=None, min_length=1, max_length=2000)
    is_done: bool | None = None


class ChecklistItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    is_done: bool
    position: int


class ChecklistReorderRequest(BaseModel):
    ordered_item_ids: list[int]


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    content_type: str | None
    size_bytes: int
    created_at: datetime


class TimeEntryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    hours: float = Field(gt=0, le=999)
    note: str | None = Field(default=None, max_length=200)
    logged_date: date | None = None


class TimeEntryUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    hours: float | None = Field(default=None, gt=0, le=999)
    note: str | None = Field(default=None, max_length=200)
    logged_date: date | None = None


class TimeEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hours: float
    note: str | None
    logged_date: date
    created_at: datetime


class TaskCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    notes: str | None = None
    column_id: int
    priority_id: int | None = None
    type_id: int | None = None
    deadline: date | None = None
    external_reference: str | None = Field(default=None, max_length=100)
    reporter_id: int | None = None
    doc_url: str | None = Field(default=None, max_length=500)
    tag_ids: list[int] = []
    checklist_items: list[str] = []


class TaskUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    notes: str | None = None
    priority_id: int | None = None
    type_id: int | None = None
    deadline: date | None = None
    external_reference: str | None = Field(default=None, max_length=100)
    reporter_id: int | None = None
    doc_url: str | None = Field(default=None, max_length=500)
    tag_ids: list[int] | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_code: str
    title: str
    description: str | None
    notes: str | None
    column_id: int
    position: int
    priority: PriorityRead
    type: TaskTypeRead | None
    deadline: date | None
    external_reference: str | None
    external_reference_url: str | None = None
    reporter: ReporterRead | None
    doc_url: str | None
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None
    tags: list[TagRead]
    checklist_items: list[ChecklistItemRead]
    attachments: list[AttachmentRead] = []
    time_entries: list[TimeEntryRead] = []
    total_hours: float = 0

    @classmethod
    def from_task(cls, task, base_url: str | None) -> TaskRead:
        data = cls.model_validate(task).model_dump()
        if base_url and task.external_reference:
            data["external_reference_url"] = f"{base_url.rstrip('/')}/{task.external_reference}"
        data["total_hours"] = round(sum(e.hours for e in task.time_entries), 2)
        return cls(**data)


class TaskMoveRequest(BaseModel):
    column_id: int
    position: int | None = None


class TaskReorderRequest(BaseModel):
    column_id: int
    ordered_task_ids: list[int]


class TaskAutoSortRequest(BaseModel):
    column_id: int
    sort_by: Literal["priority", "deadline"]
    order: Literal["asc", "desc"] | None = None


class SettingsRead(BaseModel):
    external_reference_base_url: str = ""


class SettingsUpdate(BaseModel):
    external_reference_base_url: str | None = None


class StatsBucketRead(BaseModel):
    label: str
    period_start: date
    tasks_closed: int
    hours_logged: float


class StatsBreakdownItemRead(BaseModel):
    id: int | None
    label: str
    emoji: str | None = None
    color: str | None = None
    count: int


class StatsOverviewRead(BaseModel):
    since: date
    until: date
    bucket: Literal["day", "week", "month"]
    open_tasks: int
    closed_tasks: int
    total_tasks: int
    avg_close_hours: float | None
    avg_closed_per_bucket: float
    total_hours_logged: float
    buckets: list[StatsBucketRead]
    by_type: list[StatsBreakdownItemRead]
    by_priority: list[StatsBreakdownItemRead]
    by_reporter: list[StatsBreakdownItemRead]


class BackupInfo(BaseModel):
    filename: str
    size_bytes: int
    created_at: datetime


class BackupRestoreRequest(BaseModel):
    filename: str
