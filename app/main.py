import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.database import engine, Base
from app.routes import users, todos, notes

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Todo API")

# Load origins from environment variable or default to localhost
origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
origins = [origin.strip() for origin in origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(todos.router)
app.include_router(notes.router)


@app.get("/")
def home():
    return {"message": "Todo API Running"}