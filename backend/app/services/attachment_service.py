"""Task file attachments: bytes live on disk under ATTACHMENTS_DIR, referenced
by a DB row keyed on a random ``stored_name`` (never the user-supplied one, to
dodge collisions and path traversal)."""

import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from backend.app import config
from backend.app.models import Attachment

MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024  # 25 MB — generous for a local single-user board


def _stored_name(original_filename: str) -> str:
    suffix = Path(original_filename).suffix[:20]
    return f"{uuid.uuid4().hex}{suffix}"


async def save_attachment(db: Session, task_id: int, file: UploadFile) -> Attachment:
    config.ensure_data_dirs()
    contents = await file.read()
    if len(contents) > MAX_ATTACHMENT_SIZE:
        raise ValueError("File is too large (max 25 MB)")

    stored_name = _stored_name(file.filename or "file")
    (config.ATTACHMENTS_DIR / stored_name).write_bytes(contents)

    attachment = Attachment(
        task_id=task_id,
        filename=file.filename or stored_name,
        stored_name=stored_name,
        content_type=file.content_type,
        size_bytes=len(contents),
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


def attachment_file_path(attachment: Attachment) -> Path:
    return config.ATTACHMENTS_DIR / attachment.stored_name


def delete_attachment(db: Session, attachment: Attachment) -> None:
    path = attachment_file_path(attachment)
    db.delete(attachment)
    db.commit()
    path.unlink(missing_ok=True)
