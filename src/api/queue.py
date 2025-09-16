from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database.database import get_db
from ..database.models import Player
from ..database import schemas

queue_router = APIRouter(
    tags=["queue"]
)

@queue_router.get("/")
def get_queues(db: Session = Depends(get_db)):
    """
    Get the current state of both queues (advanced and intermediate)
    """
    # For now, return active players not assigned to courts
    advanced_queue = db.query(Player).filter(
        Player.qualification == "advanced",
        Player.is_active == True,
        Player.court_id == None
    ).all()
    
    intermediate_queue = db.query(Player).filter(
        Player.qualification == "intermediate", 
        Player.is_active == True,
        Player.court_id == None
    ).all()
    
    return {
        "advanced_queue": advanced_queue,
        "intermediate_queue": intermediate_queue
    }

@queue_router.post("/{queue_type}/{player_id}")
def add_to_queue(queue_type: str, player_id: int, db: Session = Depends(get_db)):
    """
    Add a player to a queue (advanced or intermediate)
    """
    if queue_type not in ["advanced", "intermediate"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid queue type: {queue_type}. Must be 'advanced' or 'intermediate'"
        )
    
    # Check if player exists
    db_player = db.query(Player).filter(Player.id == player_id).first()
    if db_player is None:
        raise HTTPException(
            status_code=404,
            detail=f"Player with ID {player_id} not found"
        )
    
    if not db_player.is_active:
        raise HTTPException(
            status_code=400,
            detail=f"Player with ID {player_id} is not active"
        )
    
    if queue_type != db_player.qualification:
        raise HTTPException(
            status_code=400,
            detail=f"Player qualification ({db_player.qualification}) doesn't match queue type ({queue_type})"
        )
    
    # Remove from court (add to queue)
    db_player.court_id = None
    db.commit()
    db.refresh(db_player)
    
    return {"success": True, "message": "Player added to queue"}

@queue_router.delete("/{player_id}")
def remove_from_queue(player_id: int, db: Session = Depends(get_db)):
    """
    Remove a player from any queue
    """
    # Check if player exists
    db_player = db.query(Player).filter(Player.id == player_id).first()
    if db_player is None:
        raise HTTPException(
            status_code=404,
            detail=f"Player with ID {player_id} not found"
        )
    
    # For simplicity, we'll just deactivate the player
    db_player.is_active = False
    db.commit()
    
    return {
        "success": True,
        "message": "Player removed from queue"
    }

@queue_router.put("/{queue_type}/reorder")
def reorder_queue(queue_type: str, player_ids: List[int], db: Session = Depends(get_db)):
    """
    Reorder a queue based on a list of player IDs
    """
    if queue_type not in ["advanced", "intermediate"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid queue type: {queue_type}. Must be 'advanced' or 'intermediate'"
        )
    
    # For now, just return success - queue ordering can be handled client-side
    return {"success": True, "message": "Queue reordered"}
