from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.responses import content_disposition
from backend.app.schemas import BackupInfo, BackupRestoreRequest
from backend.app.services import backup_service
from backend.app.services.storage_service import StorageError

router = APIRouter(prefix="/api/backup", tags=["backup"])


@router.post("/export", response_model=BackupInfo)
def export_backup(db: Session = Depends(get_db)):
    try:
        return backup_service.export_backup(db)
    except StorageError as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get("/list", response_model=list[BackupInfo])
def list_backups():
    try:
        return backup_service.list_backups()
    except StorageError as exc:
        raise HTTPException(502, str(exc)) from exc


@router.post("/restore", status_code=204)
def restore_backup(payload: BackupRestoreRequest, db: Session = Depends(get_db)):
    try:
        backup_service.restore_backup(db, payload.filename)
    except backup_service.BackupNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except backup_service.InvalidBackupError as exc:
        raise HTTPException(400, str(exc)) from exc
    except StorageError as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get("/download/{filename}")
def download_backup(filename: str):
    try:
        data = backup_service.read_backup(filename)
    except backup_service.BackupNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except StorageError as exc:
        raise HTTPException(502, str(exc)) from exc
    return Response(
        data,
        media_type="application/json",
        headers={"Content-Disposition": content_disposition("attachment", filename)},
    )
