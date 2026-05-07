from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(tags=["Todos"])


@router.post("/todos", response_model=schemas.TodoOut)
def create_todo(
    todo: schemas.TodoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    new_todo = models.Todo(
        title=todo.title,
        details=todo.details,
        status=todo.status,
        owner_id=current_user.id
    )

    db.add(new_todo)
    db.commit()
    db.refresh(new_todo)

    return new_todo


@router.get("/todos")
def get_todos(
    page: int = 1,
    limit: int = 10,
    search: str = "",
    status: str = "",
    sort: str = "desc",
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(models.Todo).filter(
        models.Todo.owner_id == current_user.id
    )

    if search:
        query = query.filter(models.Todo.title.contains(search))

    if status:
        query = query.filter(models.Todo.status == status)

    if sort == "asc":
        query = query.order_by(models.Todo.id.asc())
    else:
        query = query.order_by(models.Todo.id.desc())

    total = query.count()

    todos = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "data": todos,
        "page": page,
        "limit": limit,
        "total": total
    }


@router.put("/todos/{id}", response_model=schemas.TodoOut)
def update_todo(
    id: int,
    todo: schemas.TodoUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    db_todo = db.query(models.Todo).filter(
        models.Todo.id == id
    ).first()

    if not db_todo:
        raise HTTPException(status_code=404, detail="Not found")

    if db_todo.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    db_todo.title = todo.title      # type: ignore
    db_todo.details = todo.details  # type: ignore
    db_todo.status = todo.status    # type: ignore

    db.commit()
    db.refresh(db_todo)

    return db_todo


@router.delete("/todos/{id}")
def delete_todo(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    db_todo = db.query(models.Todo).filter(
        models.Todo.id == id
    ).first()

    if not db_todo:
        raise HTTPException(status_code=404, detail="Not found")

    if db_todo.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    db.delete(db_todo)
    db.commit()

    return {"message": "Deleted"}
