# main.py
from typing import Annotated
from fastapi import FastAPI, Depends, Request
from src.database.models import Base  
from src.database.database import engine
from src.api.courts import court_router
from src.api.queue import queue_router
from src.api.players import player_router
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

Base.metadata.create_all(bind=engine)
app.include_router(court_router, prefix="/api/courts")
app.include_router(queue_router, prefix="/api/queue")
app.include_router(player_router, prefix="/api/players")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

origins = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    # add more origins if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        
    allow_credentials=True,
    allow_methods=["*"],          
    allow_headers=["*"],          
)
@app.get("/")
def root(request: Request):
     return templates.TemplateResponse("index.html", {"request": request})
