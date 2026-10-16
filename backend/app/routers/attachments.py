from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.file_previews import preview_for
from backend.app.models import Attachment, Task
from backend.app.responses import content_disposition
from backend.app.schemas import AttachmentRead
from backend.app.services import attachment_service
from backend.app.services.storage_service import ObjectNotFound, StorageError

router = APIRouter(prefix="/api/tasks/{task_id}/attachments", tags=["attachments"])

SANDBOXED_PREVIEW_CSP = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"


def _get_task_or_404(db: Session, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    return task


def _get_attachment_or_404(db: Session, task_id: int, attachment_id: int) -> Attachment:
    attachment = db.get(Attachment, attachment_id)
    if attachment is None or attachment.task_id != task_id:
        raise HTTPException(404, "Attachment not found")
    return attachment


def _read_or_error(attachment: Attachment) -> bytes:
    try:
        return attachment_service.read_attachment(attachment)
    except ObjectNotFound as exc:
        raise HTTPException(404, "Attachment file is missing") from exc
    except StorageError as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get("", response_model=list[AttachmentRead])
def list_attachments(task_id: int, db: Session = Depends(get_db)):
    _get_task_or_404(db, task_id)
    return db.query(Attachment).filter(Attachment.task_id == task_id).order_by(Attachment.created_at).all()


@router.post("", response_model=AttachmentRead, status_code=201)
async def upload_attachment(task_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    _get_task_or_404(db, task_id)
    try:
        return await attachment_service.save_attachment(db, task_id, file)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except StorageError as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get("/{attachment_id}/download")
def download_attachment(task_id: int, attachment_id: int, db: Session = Depends(get_db)):
    attachment = _get_attachment_or_404(db, task_id, attachment_id)
    return Response(
        _read_or_error(attachment),
        media_type=attachment.content_type or "application/octet-stream",
        headers={
            "Content-Disposition": content_disposition("attachment", attachment.filename),
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/{attachment_id}/preview")
def preview_attachment(task_id: int, attachment_id: int, db: Session = Depends(get_db)):
    attachment = _get_attachment_or_404(db, task_id, attachment_id)
    preview = preview_for(attachment.filename)
    if preview is None:
        raise HTTPException(415, "This file type can't be previewed")
    headers = {
        "Content-Disposition": content_disposition("inline", attachment.filename),
        "X-Content-Type-Options": "nosniff",
    }
    if preview.kind != "pdf":
        headers["Content-Security-Policy"] = SANDBOXED_PREVIEW_CSP
    return Response(_read_or_error(attachment), media_type=preview.media_type, headers=headers)


@router.delete("/{attachment_id}", status_code=204)
def remove_attachment(task_id: int, attachment_id: int, db: Session = Depends(get_db)):
    attachment = _get_attachment_or_404(db, task_id, attachment_id)
    attachment_service.delete_attachment(db, attachment)
