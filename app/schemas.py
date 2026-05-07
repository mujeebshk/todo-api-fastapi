from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Literal, Optional, List

TodoStatus = Literal["do", "did", "done", "block"]

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TodoCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    details: str = Field(..., min_length=3, max_length=300)

class TodoUpdate(BaseModel):
    title: str
    details: str
    status: TodoStatus = "do"

class TodoOut(BaseModel):
    id: int
    title: str
    details: str
    status: TodoStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class NoteCreate(BaseModel):
    title: str
    body: Optional[str] = None
    parent_id: Optional[int] = None

class NoteUpdate(BaseModel):
    title: str
    body: Optional[str] = None

class NoteOut(NoteCreate):
    id: int
    owner_id: int

    class Config:
        from_attributes = True