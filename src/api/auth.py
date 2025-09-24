from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional

from ..database.database import get_db
from ..database.models import Player
from ..database import schemas

auth_router = APIRouter(
    tags=["auth"]
)

@auth_router.post("/register", response_model=schemas.Player)
def register_player(player: schemas.PlayerRegister, db: Session = Depends(get_db)):
    """Register a new player"""
    # Check if player already exists by email
    existing = db.query(Player).filter(Player.email == player.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Player with this email already exists")
    
    # Create new player
    db_player = Player(
        name=player.name,
        email=player.email,
        qualification=player.qualification,
        is_active=True
    )
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return db_player

@auth_router.post("/login")
def login_player(login_data: schemas.PlayerLogin, response: Response, db: Session = Depends(get_db)):
    """Login a player by email"""
    # Find player by email
    player = db.query(Player).filter(Player.email == login_data.email).first()
    if not player:
        raise HTTPException(status_code=400, detail="Player not found. Please register first.")
    
    # Set logged in status (you can implement session management here if needed)
    player.is_active = True
    db.commit()
    
    return {
        "message": "Login successful",
        "player": {
            "id": player.id,
            "name": player.name,
            "email": player.email,
            "qualification": player.qualification
        }
    }

@auth_router.post("/logout")
def logout_player(email: str, db: Session = Depends(get_db)):
    """Logout a player"""
    player = db.query(Player).filter(Player.email == email).first()
    if player:
        player.is_active = False
        db.commit()
    return {"message": "Logout successful"}