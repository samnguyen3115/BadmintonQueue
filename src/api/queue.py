from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database.database import get_db
from ..models.models import Player, QueueEntry, CourtAssignment
from ..database import schemas

router = APIRouter(
    prefix="/api/queue",
    tags=["queue"]
)

@router.get("/", response_model=schemas.QueueInfo)
def get_queues(db: Session = Depends(get_db)):
    """
    Get the current state of both queues (advanced and intermediate)
    """
    # Get queue entries ordered by position
    advanced_entries = db.query(QueueEntry).filter(QueueEntry.queue_type == "advanced").order_by(QueueEntry.position).all()
    intermediate_entries = db.query(QueueEntry).filter(QueueEntry.queue_type == "intermediate").order_by(QueueEntry.position).all()
    
    # Get active players in advanced queue
    advanced_player_ids = [entry.player_id for entry in advanced_entries]
    advanced_queue = db.query(Player).filter(
        Player.id.in_(advanced_player_ids),
        Player.is_active == True
    ).all() if advanced_player_ids else []
    
    # Get active players in intermediate queue
    intermediate_player_ids = [entry.player_id for entry in intermediate_entries]
    intermediate_queue = db.query(Player).filter(
        Player.id.in_(intermediate_player_ids),
        Player.is_active == True
    ).all() if intermediate_player_ids else []
    
    return schemas.QueueInfo(
        advanced_queue=advanced_queue,
        intermediate_queue=intermediate_queue
    )

@router.post("/{queue_type}/{player_id}", response_model=schemas.QueueEntry)
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
    
    if queue_type == "advanced" and db_player.qualification != "advanced":
        raise HTTPException(
            status_code=400,
            detail=f"Player qualification ({db_player.qualification}) doesn't match queue type ({queue_type})"
        )
    
    if queue_type == "intermediate" and db_player.qualification != "intermediate":
        raise HTTPException(
            status_code=400,
            detail=f"Player qualification ({db_player.qualification}) doesn't match queue type ({queue_type})"
        )
    
    # First remove from any other queues
    db.query(QueueEntry).filter(QueueEntry.player_id == player_id).delete()
    
    # Also remove from courts
    db.query(CourtAssignment).filter(CourtAssignment.player_id == player_id).delete()
    db.commit()
    
    # Find the next position
    last_position = db.query(QueueEntry).filter(
        QueueEntry.queue_type == queue_type
    ).order_by(QueueEntry.position.desc()).first()
    
    next_position = 1
    if last_position:
        next_position = last_position.position + 1
    
    # Add to the new queue
    new_entry = QueueEntry(
        player_id=player_id,
        queue_type=queue_type,
        position=next_position
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

@router.delete("/{player_id}", response_model=schemas.ApiResponse)
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
    
    # Remove the player from any queue
    deleted = db.query(QueueEntry).filter(QueueEntry.player_id == player_id).delete()
    db.commit()
    
    # If a player was removed, reorder the queues to fill gaps
    if deleted > 0:
        # Reorder advanced queue
        advanced_entries = db.query(QueueEntry).filter(
            QueueEntry.queue_type == "advanced"
        ).order_by(QueueEntry.position).all()
        
        for i, entry in enumerate(advanced_entries):
            entry.position = i + 1
        
        # Reorder intermediate queue
        intermediate_entries = db.query(QueueEntry).filter(
            QueueEntry.queue_type == "intermediate"
        ).order_by(QueueEntry.position).all()
        
        for i, entry in enumerate(intermediate_entries):
            entry.position = i + 1
        
        db.commit()
    
    return schemas.ApiResponse(
        success=deleted > 0,
        message=f"Player removed from queue" if deleted > 0 else "Player was not in any queue"
    )

@router.put("/{queue_type}/reorder", response_model=List[schemas.QueueEntry])
def reorder_queue(queue_type: str, player_ids: List[int], db: Session = Depends(get_db)):
    """
    Reorder a queue based on a list of player IDs
    """
    if queue_type not in ["advanced", "intermediate"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid queue type: {queue_type}. Must be 'advanced' or 'intermediate'"
        )
    
    # Verify all players exist and are active
    for player_id in player_ids:
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
        
        # Check qualification matches queue type
        if queue_type == "advanced" and db_player.qualification != "advanced":
            raise HTTPException(
                status_code=400,
                detail=f"Player {db_player.name} (ID: {player_id}) is not qualified for {queue_type} queue"
            )
        
        if queue_type == "intermediate" and db_player.qualification != "intermediate":
            raise HTTPException(
                status_code=400,
                detail=f"Player {db_player.name} (ID: {player_id}) is not qualified for {queue_type} queue"
            )
    
    # First, delete all existing entries in this queue
    db.query(QueueEntry).filter(
        QueueEntry.queue_type == queue_type,
        QueueEntry.player_id.in_(player_ids)
    ).delete(synchronize_session=False)
    
    # Create new entries with updated positions
    new_entries = []
    for i, player_id in enumerate(player_ids):
        entry = QueueEntry(
            player_id=player_id,
            queue_type=queue_type,
            position=i + 1
        )
        db.add(entry)
        new_entries.append(entry)
    
    db.commit()
    
    # Refresh all entries to get their IDs
    for entry in new_entries:
        db.refresh(entry)
    
    return new_entries
