from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/notes", tags=["Notes"])

@router.post("/", response_model=schemas.NoteOut)
def create_note(
    note: schemas.NoteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    new_note = models.Note(
        title=note.title,
        body=note.body,
        parent_id=note.parent_id,
        owner_id=current_user.id
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.get("/", response_model=List[schemas.NoteOut])
def get_notes(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(models.Note).filter(models.Note.owner_id == current_user.id).all()

@router.put("/{id}", response_model=schemas.NoteOut)
def update_note(
    id: int,
    note: schemas.NoteUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    db_note = db.query(models.Note).filter(models.Note.id == id, models.Note.owner_id == current_user.id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db_note.title = note.title  # type: ignore
    db_note.body = note.body    # type: ignore
    db.commit()
    db.refresh(db_note)
    return db_note

@router.delete("/{id}")
def delete_note(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    db_note = db.query(models.Note).filter(models.Note.id == id, models.Note.owner_id == current_user.id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(db_note)
    db.commit()
    return {"message": "Note deleted"}