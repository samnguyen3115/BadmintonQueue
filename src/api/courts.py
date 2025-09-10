from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database.database import get_db
from ..models.models import Court, CourtAssignment, Player
from ..database import schemas

router = APIRouter(
    prefix="/api/courts",
    tags=["courts"]
)

@router.get("/", response_model=List[schemas.Court])
def get_courts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Get all courts
    """
    return db.query(Court).offset(skip).limit(limit).all()

@router.post("/", response_model=schemas.Court)
def create_court(court: schemas.CourtCreate, db: Session = Depends(get_db)):
    """
    Create a new court
    """
    db_court = db.query(Court).filter(Court.name == court.name).first()
    if db_court:
        raise HTTPException(
            status_code=400,
            detail=f"Court with name '{court.name}' already exists"
        )
    
    # Create new court
    db_court = Court(**court.model_dump())
    db.add(db_court)
    db.commit()
    db.refresh(db_court)
    return db_court

@router.get("/{court_id}", response_model=schemas.Court)
def read_court(court_id: int, db: Session = Depends(get_db)):
    """
    Get a specific court by ID
    """
    db_court = db.query(Court).filter(Court.id == court_id).first()
    if db_court is None:
        raise HTTPException(
            status_code=404,
            detail=f"Court with ID {court_id} not found"
        )
    return db_court

@router.put("/{court_id}", response_model=schemas.Court)
def update_court(court_id: int, court: schemas.CourtCreate, db: Session = Depends(get_db)):
    """
    Update a court's information
    """
    db_court = db.query(Court).filter(Court.id == court_id).first()
    if db_court is None:
        raise HTTPException(
            status_code=404,
            detail=f"Court with ID {court_id} not found"
        )
    
    # Update court attributes
    for key, value in court.model_dump().items():
        setattr(db_court, key, value)
    
    db.commit()
    db.refresh(db_court)
    return db_court

@router.get("/{court_id}/players", response_model=List[schemas.Player])
def get_players_on_court(court_id: int, db: Session = Depends(get_db)):
    """
    Get all players assigned to a specific court
    """
    # Check if court exists
    db_court = db.query(Court).filter(Court.id == court_id).first()
    if db_court is None:
        raise HTTPException(
            status_code=404,
            detail=f"Court with ID {court_id} not found"
        )
    
    # Get court assignments and the associated players
    assignments = db.query(CourtAssignment).filter(CourtAssignment.court_id == court_id).all()
    player_ids = [assignment.player_id for assignment in assignments]
    
    # Get the player objects
    players = db.query(Player).filter(Player.id.in_(player_ids)).all() if player_ids else []
    
    return players

@router.post("/{court_id}/assign/{player_id}", response_model=schemas.CourtAssignment)
def assign_player_to_court(court_id: int, player_id: int, db: Session = Depends(get_db)):
    """
    Assign a player to a court
    """
    # Check if court exists
    db_court = db.query(Court).filter(Court.id == court_id).first()
    if db_court is None:
        raise HTTPException(
            status_code=404,
            detail=f"Court with ID {court_id} not found"
        )
    
    # Check if player exists
    db_player = db.query(Player).filter(Player.id == player_id).first()
    if db_player is None:
        raise HTTPException(
            status_code=404,
            detail=f"Player with ID {player_id} not found"
        )
    
    # Check if court already has 4 players
    assignments = db.query(CourtAssignment).filter(CourtAssignment.court_id == court_id).all()
    if len(assignments) >= 4:
        raise HTTPException(
            status_code=400,
            detail=f"Court is full (maximum 4 players)"
        )
    
    # Check if player qualification matches court type
    if (db_court.court_type == "advanced" and db_player.qualification != "advanced" or
        db_court.court_type == "intermediate" and db_player.qualification != "intermediate"):
        raise HTTPException(
            status_code=400,
            detail=f"Player qualification ({db_player.qualification}) doesn't match court type ({db_court.court_type})"
        )
    
    # Check if player is already assigned to a court
    player_assignment = db.query(CourtAssignment).filter(CourtAssignment.player_id == player_id).first()
    if player_assignment:
        raise HTTPException(
            status_code=400,
            detail=f"Player with ID {player_id} is already assigned to a court"
        )
    
    # Create assignment
    db_assignment = CourtAssignment(court_id=court_id, player_id=player_id)
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

@router.delete("/{court_id}/remove/{player_id}", response_model=schemas.ApiResponse)
def remove_player_from_court(court_id: int, player_id: int, db: Session = Depends(get_db)):
    """
    Remove a player from a court
    """
    # Check if court exists
    db_court = db.query(Court).filter(Court.id == court_id).first()
    if db_court is None:
        raise HTTPException(
            status_code=404,
            detail=f"Court with ID {court_id} not found"
        )
    
    # Check if player exists
    db_player = db.query(Player).filter(Player.id == player_id).first()
    if db_player is None:
        raise HTTPException(
            status_code=404,
            detail=f"Player with ID {player_id} not found"
        )
    
    # Find the assignment and remove it
    assignment = db.query(CourtAssignment).filter(
        CourtAssignment.player_id == player_id,
        CourtAssignment.court_id == court_id
    ).first()
    
    if assignment:
        db.delete(assignment)
        db.commit()
        success = True
    else:
        success = False
    
    return schemas.ApiResponse(
        success=success,
        message=f"Player removed from court" if success else "Player was not assigned to this court"
    )
