"""SQLAlchemy ORM models for Flowdesk."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Table, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base

task_tags = Table(
    "task_tags",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class BoardColumn(Base):
    """A workflow column/status on the (single) board.

    The columns seeded on first run (``is_default``) are permanent fixtures:
    they can be hidden from the board but never renamed or deleted, so the
    app always has a coherent default workflow to fall back on.
    """

    __tablename__ = "columns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    emoji: Mapped[str | None] = mapped_column(String(8), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    tasks: Mapped[list[Task]] = relationship(back_populates="column")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False)
    emoji: Mapped[str | None] = mapped_column(String(8), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    tasks: Mapped[list[Task]] = relationship(secondary=task_tags, back_populates="tags")


class Priority(Base):
    """A priority level tasks can be assigned, editable like columns/tags.

    ``key`` is a stable machine identifier only ever set on the four
    seeded defaults (used to migrate legacy data and to recognize them
    regardless of renaming); user-created priorities leave it null.
    Defaults follow the same "hide, don't delete" rule as default columns.
    """

    __tablename__ = "priorities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    emoji: Mapped[str] = mapped_column(String(8), nullable=False, default="⚪")
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#64748b")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    tasks: Mapped[list[Task]] = relationship(back_populates="priority")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    display_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    column_id: Mapped[int] = mapped_column(ForeignKey("columns.id"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    priority_id: Mapped[int] = mapped_column(ForeignKey("priorities.id"), nullable=False)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    external_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    column: Mapped[BoardColumn] = relationship(back_populates="tasks")
    priority: Mapped[Priority] = relationship(back_populates="tasks")
    tags: Mapped[list[Tag]] = relationship(secondary=task_tags, back_populates="tasks")
    checklist_items: Mapped[list[ChecklistItem]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="ChecklistItem.position",
    )
    attachments: Mapped[list[Attachment]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="Attachment.created_at",
    )


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    task: Mapped[Task] = relationship(back_populates="checklist_items")


class Attachment(Base):
    """A file uploaded to a task. Stored on disk under ``config.ATTACHMENTS_DIR``
    as ``stored_name`` (a random name, to dodge collisions/path-traversal);
    ``filename`` keeps the original name for display and download."""

    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    task: Mapped[Task] = relationship(back_populates="attachments")


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
