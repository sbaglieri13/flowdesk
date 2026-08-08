"""Manual backup export/list/restore of the SQLite database file."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.app.schemas import BackupInfo, BackupRestoreRequest
from backend.app.services import backup_service

router = APIRouter(prefix="/api/backup", tags=["backup"])


@router.post("/export", response_model=BackupInfo)
def export_backup():
    return backup_service.export_backup()


@router.get("/list", response_model=list[BackupInfo])
def list_backups():
    return backup_service.list_backups()


@router.post("/restore", status_code=204)
def restore_backup(payload: BackupRestoreRequest):
    try:
        backup_service.restore_backup(payload.filename)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc


@router.get("/download/{filename}")
def download_backup(filename: str):
    try:
        path = backup_service.backup_file_path(filename)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return FileResponse(path, filename=path.name, media_type="application/octet-stream")
