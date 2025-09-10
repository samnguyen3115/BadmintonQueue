from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_

from ..database.database import get_db
from ..models.models import Player
from ..database import schemas

router = APIRouter(
    prefix="/api/players",
    tags=["players"]
)

@router.get("/", response_model=List[schemas.Player])
def get_players(
    skip: int = 0, 
    limit: int = 100, 
    active_only: bool = False, 
    db: Session = Depends(get_db)
):
    """
    Get all players or only active players
    """
    query = db.query(Player)
    if active_only:
        query = query.filter(Player.is_active == True)
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=schemas.Player)
def create_player(player: schemas.PlayerCreate, db: Session = Depends(get_db)):
    """
    Create a new player
    """
    # Check if player with same name already exists
    db_player = db.query(Player).filter(Player.name == player.name).first()
    if db_player:
        raise HTTPException(
            status_code=400,
            detail=f"Player with name '{player.name}' already exists"
        )
    
    # Create new player
    db_player = Player(**player.model_dump())
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return db_player

@router.get("/{player_id}", response_model=schemas.Player)
def read_player(player_id: int, db: Session = Depends(get_db)):
    """
    Get a specific player by ID
    """
    db_player = db.query(Player).filter(Player.id == player_id).first()
    if db_player is None:
        raise HTTPException(
            status_code=404,
            detail=f"Player with ID {player_id} not found"
        )
    return db_player

@router.put("/{player_id}", response_model=schemas.Player)
def update_player(player_id: int, player: schemas.PlayerCreate, db: Session = Depends(get_db)):
    """
    Update a player's information
    """
    db_player = db.query(Player).filter(Player.id == player_id).first()
    if db_player is None:
        raise HTTPException(
            status_code=404,
            detail=f"Player with ID {player_id} not found"
        )
    
    # Update player attributes
    for key, value in player.model_dump().items():
        setattr(db_player, key, value)
    
    db.commit()
    db.refresh(db_player)
    return db_player

@router.delete("/{player_id}", response_model=schemas.ApiResponse)
def delete_player(player_id: int, db: Session = Depends(get_db)):
    """
    Delete a player
    """
    db_player = db.query(Player).filter(Player.id == player_id).first()
    if db_player is None:
        raise HTTPException(
            status_code=404,
            detail=f"Player with ID {player_id} not found"
        )
    
    try:
        db.delete(db_player)
        db.commit()
        success = True
    except Exception as e:
        db.rollback()
        success = False
    
    return schemas.ApiResponse(
        success=success,
        message=f"Player with ID {player_id} deleted" if success else "Failed to delete player"
    )

@router.post("/{player_id}/toggle-active", response_model=schemas.Player)
def toggle_player_active(player_id: int, db: Session = Depends(get_db)):
    """
    Toggle a player's active status
    """
    db_player = db.query(Player).filter(Player.id == player_id).first()
    if db_player is None:
        raise HTTPException(
            status_code=404,
            detail=f"Player with ID {player_id} not found"
        )
    
    # Toggle active status
    db_player.is_active = not db_player.is_active
    
    # If player is deactivated, remove from queue and courts
    if not db_player.is_active:
        # These would need to be handled directly in the API file or imported from other modules
        # For now, we'll handle this functionality in the route handlers for those entities
        pass
    
    db.commit()
    db.refresh(db_player)
    return db_player

@router.get("/active/list", response_model=List[schemas.Player])
def get_active_players(db: Session = Depends(get_db)):
    """
    Get all active players
    """
    return db.query(Player).filter(Player.is_active == True).all()

@router.get("/inactive/list", response_model=List[schemas.Player])
def get_inactive_players(db: Session = Depends(get_db)):
    """
    Get all inactive players
    """
    return db.query(Player).filter(Player.is_active == False).all()

@router.get("/search/{search_term}", response_model=List[schemas.Player])
def search_players(search_term: str, db: Session = Depends(get_db)):
    """
    Search for players by name or email
    """
    search = f"%{search_term}%"
    return db.query(Player).filter(
        or_(
            Player.name.ilike(search),
            Player.email.ilike(search) if hasattr(Player, 'email') else False
        )
    ).all()
