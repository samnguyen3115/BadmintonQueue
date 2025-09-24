from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database.database import get_db
from ..database.models import Court, Player, CourtAssignment
from ..database import schemas
from .queue import move_player_to_queue_internal

court_router = APIRouter(
    tags=["courts"]
)

@court_router.get("/", response_model=List[schemas.Court])
def get_courts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all courts"""
    return db.query(Court).offset(skip).limit(limit).all()

@court_router.post("/", response_model=schemas.Court)
def create_court(court: schemas.CourtCreate, db: Session = Depends(get_db)):
    """Create a new court"""
    db_court = db.query(Court).filter(Court.name == court.name).first()
    if db_court:
        raise HTTPException(
            status_code=400,
            detail=f"Court with name '{court.name}' already exists"
        )
    
    db_court = Court(**court.model_dump())
    db.add(db_court)
    db.commit()
    db.refresh(db_court)
    return db_court

@court_router.get("/{court_id}", response_model=schemas.Court)
def read_court(court_id: int, db: Session = Depends(get_db)):
    """Get a specific court by ID"""
    db_court = db.query(Court).filter(Court.id == court_id).first()
    if db_court is None:
        raise HTTPException(
            status_code=404,
            detail=f"Court with ID {court_id} not found"
        )
    return db_court

@court_router.put("/{court_id}", response_model=schemas.CourtUpdateResponse)
def update_court(court_id: int, court: schemas.CourtCreate, db: Session = Depends(get_db)):
    """Update court info. Auto-moves players to queue when changed to training"""
    db_court = db.query(Court).filter(Court.id == court_id).first()
    if db_court is None:
        raise HTTPException(
            status_code=404,
            detail=f"Court with ID {court_id} not found"
        )
    
    old_court_type = db_court.court_type
    new_court_type = court.court_type
    moved_players = []
    
    if old_court_type != "training" and new_court_type == "training":
        players_on_court = db.query(Player).filter(Player.court_id == court_id, Player.is_active == True).all()
        
        for player in players_on_court:
            player.court_id = None
            moved_players.append(player)
        
        if moved_players:
            db.commit()
    
    for key, value in court.model_dump().items():
        setattr(db_court, key, value)
    
    db.commit()
    db.refresh(db_court)
    

    
    if moved_players:
        player_names = [p.name for p in moved_players]
        message = f"Court {db_court.name} updated to {new_court_type}. Moved {len(moved_players)} players back to queue: {', '.join(player_names)}"
    else:
        message = f"Court {db_court.name} updated to {new_court_type}"
    
    return schemas.CourtUpdateResponse(
        court=db_court,
        moved_players=moved_players,
        message=message
    )

@court_router.get("/{court_id}/players", response_model=List[schemas.Player])
def get_players_on_court(court_id: int, db: Session = Depends(get_db)):
    """Get all players assigned to a specific court"""
    db_court = db.query(Court).filter(Court.id == court_id).first()
    if db_court is None:
        raise HTTPException(
            status_code=404,
            detail=f"Court with ID {court_id} not found"
        )
    
    players = db.query(Player).filter(Player.court_id == court_id, Player.is_active == True).all()
    return players

@court_router.post("/{court_id}/assign/{player_id}", response_model=schemas.ApiResponse)
def assign_player_to_court(court_id: int, player_id: int, db: Session = Depends(get_db)):
    """Assign a player to a court"""
    db_court = db.query(Court).filter(Court.id == court_id).first()
    if db_court is None:
        raise HTTPException(
            status_code=404,
            detail=f"Court with ID {court_id} not found"
        )
    
    db_player = db.query(Player).filter(Player.id == player_id, Player.is_active == True).first()
    if db_player is None:
        raise HTTPException(
            status_code=404,
            detail=f"Active player with ID {player_id} not found"
        )
    
    current_players_count = db.query(Player).filter(Player.court_id == court_id, Player.is_active == True).count()
    
    if current_players_count >= 4:
        raise HTTPException(
            status_code=400,
            detail=f"Court is full (maximum 4 players)"
        )
    
    if db_court.court_type == "training":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot assign players to training courts. Training courts are for practice only."
        )

    if (db_court.court_type == "advanced" and db_player.qualification != "advanced" or
        db_court.court_type == "intermediate" and db_player.qualification != "intermediate"):
        raise HTTPException(
            status_code=400,
            detail=f"Player qualification ({db_player.qualification}) doesn't match court type ({db_court.court_type})"
        )
    
    if db_player.court_id is not None:
        raise HTTPException(
            status_code=400,
            detail=f"Player with ID {player_id} is already assigned to a court"
        )
    
    db_player.court_id = court_id
    db.commit()
    db.refresh(db_player)
    
    return schemas.ApiResponse(
        success=True,
        message=f"Player {db_player.name} assigned to court {db_court.name}"
    )

@court_router.delete("/{court_id}/remove/{player_id}", response_model=schemas.ApiResponse)
def remove_player_from_court(court_id: int, player_id: int, db: Session = Depends(get_db)):
    """Remove a player from a court"""
    db_court = db.query(Court).filter(Court.id == court_id).first()
    if db_court is None:
        raise HTTPException(
            status_code=404,
            detail=f"Court with ID {court_id} not found"
        )
    
    db_player = db.query(Player).filter(Player.id == player_id, Player.is_active == True).first()
    if db_player is None:
        raise HTTPException(
            status_code=404,
            detail=f"Active player with ID {player_id} not found"
        )
    
    if db_player.court_id == court_id:
        db_player.court_id = None
        db.commit()
        success = True
        message = f"Player {db_player.name} removed from court {db_court.name}"
    else:
        success = False
        message = "Player was not assigned to this court"
    
    return schemas.ApiResponse(
        success=success,
        message=message
    )
