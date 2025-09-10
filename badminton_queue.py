# main.py
from typing import Annotated
from fastapi import FastAPI, Depends
from src.api.devices import devices_router
from src.database.models import Base  
from src.database.database import engine
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm




app = FastAPI()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
Base.metadata.create_all(bind=engine)
app.include_router(devices_router)



@app.get("/")
def root():
    return {"message": "EnviroHub API is running"}

@app.get("/items/")
async def read_items(token: Annotated[str, Depends(oauth2_scheme)]):
    return {"token": token}

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)