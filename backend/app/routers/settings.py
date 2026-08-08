"""Application settings (key-value)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas import SettingsRead, SettingsUpdate
from backend.app.services.settings_service import get_settings_dict, set_setting

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsRead)
def get_settings(db: Session = Depends(get_db)):
    return SettingsRead(**get_settings_dict(db))


@router.put("", response_model=SettingsRead)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    for key, value in payload.model_dump(exclude_unset=True).items():
        set_setting(db, key, value or "")
    db.commit()
    return SettingsRead(**get_settings_dict(db))
