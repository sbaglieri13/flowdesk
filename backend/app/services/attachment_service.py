import logging
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models import Attachment
from backend.app.services.storage_service import StorageError, get_storage

MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024

logger = logging.getLogger(__name__)


def _stored_name(original_filename: str) -> str:
    suffix = "".join(ch for ch in Path(original_filename).suffix[:20] if ch.isalnum() or ch == ".")
    return f"{uuid.uuid4().hex}{suffix}"


async def save_attachment(db: Session, task_id: int, file: UploadFile) -> Attachment:
    contents = await file.read(MAX_ATTACHMENT_SIZE + 1)
    if len(contents) > MAX_ATTACHMENT_SIZE:
        raise ValueError("File is too large (max 25 MB)")

    stored_name = _stored_name(file.filename or "file")
    get_storage().put(settings.attachments_bucket, stored_name, contents, file.content_type)

    attachment = Attachment(
        task_id=task_id,
        filename=file.filename or stored_name,
        stored_name=stored_name,
        content_type=file.content_type,
        size_bytes=len(contents),
    )
    db.add(attachment)
    try:
        db.commit()
    except Exception:
        db.rollback()
        remove_attachment_files([stored_name])
        raise
    db.refresh(attachment)
    return attachment


def read_attachment(attachment: Attachment) -> bytes:
    return get_storage().get(settings.attachments_bucket, attachment.stored_name)


def remove_attachment_files(stored_names: list[str]) -> None:
    try:
        get_storage().delete(settings.attachments_bucket, stored_names)
    except StorageError as exc:
        logger.warning("Could not delete attachment files %s: %s", stored_names, exc)


def delete_attachment(db: Session, attachment: Attachment) -> None:
    stored_name = attachment.stored_name
    db.delete(attachment)
    db.commit()
    remove_attachment_files([stored_name])
