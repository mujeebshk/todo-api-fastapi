from fastapi import FastAPI
from app.database import engine, Base
from app.routes import users, todos

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Todo API")

app.include_router(users.router)
app.include_router(todos.router)


@app.get("/")
def home():
    return {"message": "Todo API Running"}