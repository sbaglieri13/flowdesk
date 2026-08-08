"""File attachment upload/list/download/delete, nested under a task."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Attachment, Task
from backend.app.schemas import AttachmentRead
from backend.app.services import attachment_service

router = APIRouter(prefix="/api/tasks/{task_id}/attachments", tags=["attachments"])


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


@router.get("/{attachment_id}/download")
def download_attachment(task_id: int, attachment_id: int, db: Session = Depends(get_db)):
    attachment = _get_attachment_or_404(db, task_id, attachment_id)
    path = attachment_service.attachment_file_path(attachment)
    if not path.is_file():
        raise HTTPException(404, "Attachment file is missing")
    media_type = attachment.content_type or "application/octet-stream"
    return FileResponse(path, filename=attachment.filename, media_type=media_type)


@router.delete("/{attachment_id}", status_code=204)
def remove_attachment(task_id: int, attachment_id: int, db: Session = Depends(get_db)):
    attachment = _get_attachment_or_404(db, task_id, attachment_id)
    attachment_service.delete_attachment(db, attachment)
