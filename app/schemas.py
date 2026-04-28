from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Literal

status: Literal["pending", "completed"] = "pending"

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TodoCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=3, max_length=300)

class TodoUpdate(BaseModel):
    title: str
    description: str
    status: Literal["pending", "completed"] = "pending"


class TodoOut(BaseModel):
    id: int
    title: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True