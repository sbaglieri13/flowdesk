"""Tag CRUD."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Tag
from backend.app.schemas import TagCreate, TagRead, TagUpdate

router = APIRouter(prefix="/api/tags", tags=["tags"])

DUPLICATE_NAME_ERROR = "A tag with this name already exists"


@router.get("", response_model=list[TagRead])
def list_tags(db: Session = Depends(get_db)):
    return db.query(Tag).order_by(Tag.name).all()


@router.post("", response_model=TagRead, status_code=201)
def create_tag(payload: TagCreate, db: Session = Depends(get_db)):
    if db.query(Tag).filter(Tag.name == payload.name).first():
        raise HTTPException(409, DUPLICATE_NAME_ERROR)
    tag = Tag(name=payload.name, color=payload.color, emoji=payload.emoji)
    db.add(tag)
    try:
        db.commit()
    except IntegrityError as exc:
        # Two identical creates can both pass the check above before either
        # commits (e.g. a double-click); the unique constraint is the real
        # guard, so translate its failure into the same friendly 409.
        db.rollback()
        raise HTTPException(409, DUPLICATE_NAME_ERROR) from exc
    db.refresh(tag)
    return tag


@router.patch("/{tag_id}", response_model=TagRead)
def update_tag(tag_id: int, payload: TagUpdate, db: Session = Depends(get_db)):
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(404, "Tag not found")
    if payload.name and db.query(Tag).filter(Tag.name == payload.name, Tag.id != tag_id).first():
        raise HTTPException(409, DUPLICATE_NAME_ERROR)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tag, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, DUPLICATE_NAME_ERROR) from exc
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(404, "Tag not found")
    db.delete(tag)
    db.commit()
