from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas import StatsOverviewRead
from backend.app.services import stats_service

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/overview", response_model=StatsOverviewRead)
def get_overview(
    since: date | None = Query(default=None, description="Omit for all-time (since the first task)"),
    until: date | None = Query(default=None, description="Defaults to today"),
    bucket: Literal["day", "week", "month"] = Query(default="week"),
    db: Session = Depends(get_db),
):
    try:
        return stats_service.get_overview(db, since, until or date.today(), bucket)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
