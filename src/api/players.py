from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_

from ..database.database import get_db
from ..database.models import Player, Court, Team
from ..database import schemas
templates = Jinja2Templates(directory="templates")

player_router = APIRouter(
    tags=["players"]
)


@player_router.get("/", response_model=List[schemas.Player])
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


@player_router.post("/", response_model=schemas.Player)
def create_player(player: schemas.PlayerCreate, db: Session = Depends(get_db)):
    # Check if player already exists
    existing = db.query(Player).filter(Player.name == player.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Player already exists")
    
    db_player = Player(**player.model_dump())  # create Player
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return db_player


@player_router.get("/{player_id}", response_model=schemas.Player)
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


@player_router.put("/{player_id}", response_model=schemas.Player)
def update_player(
    player_id: int, 
    qualification: str | None = Query(None), 
    court_id: int | None = Query(None), 
    db: Session = Depends(get_db)
):
    """
    Update a player's information (qualification and/or court assignment)
    """
    db_player = db.query(Player).filter(Player.id == player_id).first()
    if db_player is None:
        raise HTTPException(
            status_code=404,
            detail=f"Player with ID {player_id} not found"
        )

    # Update qualification if provided
    if qualification is not None:
        db_player.qualification = qualification
    
    # Update court if provided
    if court_id is not None:
        # Check if court exists
        court = db.query(Court).filter(Court.id == court_id).first()
        if not court:
            raise HTTPException(
                status_code=404, 
                detail=f"Court with ID {court_id} not found"
            )
        db_player.court_id = court_id
    
    db.commit()
    db.refresh(db_player)
    return db_player

@player_router.delete("/{player_id}", response_model=schemas.ApiResponse)
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


@player_router.post("/{player_id}/toggle-active", response_model=schemas.Player)
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


@player_router.get("/active/list", response_model=List[schemas.Player])
def get_active_players(db: Session = Depends(get_db)):
    """
    Get all active players
    """
    return db.query(Player).filter(Player.is_active == True).all()


@player_router.get("/inactive/list", response_model=List[schemas.Player])
def get_inactive_players(db: Session = Depends(get_db)):
    """
    Get all inactive players
    """
    return db.query(Player).filter(Player.is_active == False).all()


@player_router.get("/search/{search_term}", response_model=List[schemas.Player])
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
