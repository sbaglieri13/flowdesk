from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Reporter, Task
from backend.app.schemas import ReporterCreate, ReporterRead, ReporterUpdate

router = APIRouter(prefix="/api/reporters", tags=["reporters"])

DUPLICATE_NAME_ERROR = "A reporter with this name already exists"


@router.get("", response_model=list[ReporterRead])
def list_reporters(db: Session = Depends(get_db)):
    return db.query(Reporter).order_by(Reporter.name).all()


@router.post("", response_model=ReporterRead, status_code=201)
def create_reporter(payload: ReporterCreate, db: Session = Depends(get_db)):
    if db.query(Reporter).filter(Reporter.name == payload.name).first():
        raise HTTPException(409, DUPLICATE_NAME_ERROR)
    reporter = Reporter(name=payload.name)
    db.add(reporter)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, DUPLICATE_NAME_ERROR) from exc
    db.refresh(reporter)
    return reporter


@router.patch("/{reporter_id}", response_model=ReporterRead)
def update_reporter(reporter_id: int, payload: ReporterUpdate, db: Session = Depends(get_db)):
    reporter = db.get(Reporter, reporter_id)
    if reporter is None:
        raise HTTPException(404, "Reporter not found")
    if db.query(Reporter).filter(Reporter.name == payload.name, Reporter.id != reporter_id).first():
        raise HTTPException(409, DUPLICATE_NAME_ERROR)
    reporter.name = payload.name
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, DUPLICATE_NAME_ERROR) from exc
    db.refresh(reporter)
    return reporter


@router.delete("/{reporter_id}", status_code=204)
def delete_reporter(reporter_id: int, db: Session = Depends(get_db)):
    reporter = db.get(Reporter, reporter_id)
    if reporter is None:
        raise HTTPException(404, "Reporter not found")

    db.query(Task).filter(Task.reporter_id == reporter_id).update({Task.reporter_id: None})

    db.delete(reporter)
    db.commit()
