from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging

from ..database.database import get_db
from ..database.models import Court, Player
from ..database import schemas

automation_router = APIRouter(
    tags=["automation"]
)

logger = logging.getLogger(__name__)

class AutoAssignmentService:
    """Service for automatically assigning players to courts"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_empty_courts(self) -> List[Court]:
        """Get all courts that have less than 4 players"""
        courts = self.db.query(Court).all()
        empty_courts = []
        
        for court in courts:
            player_count = self.db.query(Player).filter(Player.court_id == court.id).count()
            if player_count < 4:
                empty_courts.append(court)
        
        return empty_courts
    
    def get_queued_players(self, qualification: str) -> List[Player]:
        """Get players in queue for a specific qualification"""
        return self.db.query(Player).filter(
            Player.qualification == qualification,
            Player.is_active == True,
            Player.court_id == None
        ).all()
    
    def can_assign_to_court(self, player: Player, court: Court) -> bool:
        """Check if a player can be assigned to a court"""
        # Check court capacity
        current_players = self.db.query(Player).filter(Player.court_id == court.id).count()
        if current_players >= 4:
            return False
        
        # Check qualification match (allow training courts for any qualification)
        if court.court_type == "training":
            return True
        
        if court.court_type != player.qualification:
            return False
        
        return True
    
    def assign_player_to_court(self, player: Player, court: Court) -> bool:
        """Assign a player to a court"""
        try:
            if not self.can_assign_to_court(player, court):
                return False
            
            player.court_id = court.id
            self.db.commit()
            logger.info(f"Auto-assigned player {player.name} to court {court.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to assign player {player.name} to court {court.name}: {e}")
            self.db.rollback()
            return False
    
    def auto_fill_courts(self) -> Dict[str, Any]:
        """Automatically fill empty courts with queued players based on qualification matching"""
        assignments_made = []
        errors = []
        
        try:
            # Get empty courts sorted by priority and qualification
            empty_courts = self.get_empty_courts()
            
            # Separate courts by type for better assignment logic
            advanced_courts = [c for c in empty_courts if c.court_type == "advanced"]
            intermediate_courts = [c for c in empty_courts if c.court_type == "intermediate"] 
            training_courts = [c for c in empty_courts if c.court_type == "training"]
            
            # Get queued players by qualification
            advanced_players = self.get_queued_players("advanced")
            intermediate_players = self.get_queued_players("intermediate")
            
            # Priority 1: Fill advanced courts with advanced players
            for court in advanced_courts:
                current_players = self.db.query(Player).filter(Player.court_id == court.id).count()
                slots_available = 4 - current_players
                
                if slots_available > 0 and advanced_players:
                    players_to_assign = advanced_players[:slots_available]
                    for player in players_to_assign:
                        if self.assign_player_to_court(player, court):
                            assignments_made.append({
                                "player_name": player.name,
                                "player_id": player.id,
                                "player_qualification": player.qualification,
                                "court_name": court.name,
                                "court_id": court.id,
                                "court_type": court.court_type,
                                "match_type": "perfect_match"
                            })
                            advanced_players.remove(player)
            
            # Priority 2: Fill intermediate courts with intermediate players
            for court in intermediate_courts:
                current_players = self.db.query(Player).filter(Player.court_id == court.id).count()
                slots_available = 4 - current_players
                
                if slots_available > 0 and intermediate_players:
                    players_to_assign = intermediate_players[:slots_available]
                    for player in players_to_assign:
                        if self.assign_player_to_court(player, court):
                            assignments_made.append({
                                "player_name": player.name,
                                "player_id": player.id,
                                "player_qualification": player.qualification,
                                "court_name": court.name,
                                "court_id": court.id,
                                "court_type": court.court_type,
                                "match_type": "perfect_match"
                            })
                            intermediate_players.remove(player)
            
            # Priority 3: Fill training courts with any players (mixed levels allowed)
            for court in training_courts:
                current_players = self.db.query(Player).filter(Player.court_id == court.id).count()
                slots_available = 4 - current_players
                
                if slots_available > 0:
                    # Combine remaining players
                    remaining_players = advanced_players + intermediate_players
                    players_to_assign = remaining_players[:slots_available]
                    
                    for player in players_to_assign:
                        if self.assign_player_to_court(player, court):
                            assignments_made.append({
                                "player_name": player.name,
                                "player_id": player.id,
                                "player_qualification": player.qualification,
                                "court_name": court.name,
                                "court_id": court.id,
                                "court_type": court.court_type,
                                "match_type": "training_court"
                            })
                            if player in advanced_players:
                                advanced_players.remove(player)
                            elif player in intermediate_players:
                                intermediate_players.remove(player)
            
            # Priority 4: If intermediate courts are still empty, allow advanced players (overflow)
            for court in intermediate_courts:
                current_players = self.db.query(Player).filter(Player.court_id == court.id).count()
                slots_available = 4 - current_players
                
                if slots_available > 0 and advanced_players:
                    players_to_assign = advanced_players[:slots_available]
                    for player in players_to_assign:
                        if self.assign_player_to_court(player, court):
                            assignments_made.append({
                                "player_name": player.name,
                                "player_id": player.id,
                                "player_qualification": player.qualification,
                                "court_name": court.name,
                                "court_id": court.id,
                                "court_type": court.court_type,
                                "match_type": "overflow_assignment"
                            })
                            advanced_players.remove(player)
            
            return {
                "success": True,
                "assignments_made": len(assignments_made),
                "details": assignments_made,
                "errors": errors,
                "remaining_advanced": len(advanced_players),
                "remaining_intermediate": len(intermediate_players)
            }
        
        except Exception as e:
            logger.error(f"Auto-fill courts error: {e}")
            return {
                "success": False,
                "assignments_made": 0,
                "details": [],
                "errors": [str(e)]
            }

@automation_router.post("/auto-fill-courts", response_model=schemas.ApiResponse)
def auto_fill_courts(db: Session = Depends(get_db)):
    """
    Automatically fill empty courts with players from the queue
    """
    service = AutoAssignmentService(db)
    result = service.auto_fill_courts()
    
    message = f"Auto-assignment completed: {result['assignments_made']} players assigned"
    if result['errors']:
        message += f" ({len(result['errors'])} errors)"
    
    return schemas.ApiResponse(
        success=result['success'],
        message=message,
        data=result
    )

@automation_router.get("/court-status", response_model=List[Dict[str, Any]])
def get_court_status(db: Session = Depends(get_db)):
    """
    Get the current status of all courts (player count and availability)
    """
    courts = db.query(Court).all()
    court_status = []
    
    for court in courts:
        players = db.query(Player).filter(Player.court_id == court.id).all()
        court_status.append({
            "court_id": court.id,
            "court_name": court.name,
            "court_type": court.court_type,
            "player_count": len(players),
            "slots_available": 4 - len(players),
            "is_full": len(players) >= 4,
            "players": [{"id": p.id, "name": p.name, "qualification": p.qualification} for p in players]
        })
    
    return court_status

@automation_router.get("/queue-status", response_model=Dict[str, Any])
def get_queue_status(db: Session = Depends(get_db)):
    """
    Get the current status of all queues
    """
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
        "advanced_queue": {
            "count": len(advanced_queue),
            "players": [{"id": p.id, "name": p.name} for p in advanced_queue]
        },
        "intermediate_queue": {
            "count": len(intermediate_queue),
            "players": [{"id": p.id, "name": p.name} for p in intermediate_queue]
        },
        "total_in_queue": len(advanced_queue) + len(intermediate_queue)
    }

@automation_router.post("/smart-assign", response_model=schemas.ApiResponse)
def smart_assign_players(db: Session = Depends(get_db)):
    """
    Smart assignment that prioritizes qualification matching and court types
    Priority: Advanced players → Advanced courts → Intermediate courts (overflow)
             Intermediate players → Intermediate courts → Training courts
    """
    service = AutoAssignmentService(db)
    
    try:
        assignments_made = []
        
        # Get all courts categorized by type
        all_courts = db.query(Court).all()
        advanced_courts = [c for c in all_courts if c.court_type == "advanced"]
        intermediate_courts = [c for c in all_courts if c.court_type == "intermediate"]
        training_courts = [c for c in all_courts if c.court_type == "training"]
        
        # Sort courts by current occupancy (fill partially filled courts first)
        def sort_by_occupancy(court):
            current_players = db.query(Player).filter(Player.court_id == court.id).count()
            return current_players  # Fill partially filled courts first
        
        advanced_courts.sort(key=sort_by_occupancy, reverse=True)
        intermediate_courts.sort(key=sort_by_occupancy, reverse=True)
        training_courts.sort(key=sort_by_occupancy, reverse=True)
        
        # Get queued players
        advanced_players = db.query(Player).filter(
            Player.qualification == "advanced",
            Player.is_active == True,
            Player.court_id == None
        ).all()
        
        intermediate_players = db.query(Player).filter(
            Player.qualification == "intermediate",
            Player.is_active == True,
            Player.court_id == None
        ).all()
        
        # PHASE 1: Advanced players to advanced courts
        for court in advanced_courts:
            current_players = db.query(Player).filter(Player.court_id == court.id).count()
            slots_available = 4 - current_players
            
            if slots_available > 0 and advanced_players:
                players_to_assign = advanced_players[:slots_available]
                for player in players_to_assign:
                    if service.assign_player_to_court(player, court):
                        assignments_made.append({
                            "player_name": player.name,
                            "court_name": court.name,
                            "assignment_type": "Advanced → Advanced Court"
                        })
                        advanced_players.remove(player)
        
        # PHASE 2: Intermediate players to intermediate courts
        for court in intermediate_courts:
            current_players = db.query(Player).filter(Player.court_id == court.id).count()
            slots_available = 4 - current_players
            
            if slots_available > 0 and intermediate_players:
                players_to_assign = intermediate_players[:slots_available]
                for player in players_to_assign:
                    if service.assign_player_to_court(player, court):
                        assignments_made.append({
                            "player_name": player.name,
                            "court_name": court.name,
                            "assignment_type": "Intermediate → Intermediate Court"
                        })
                        intermediate_players.remove(player)
        
        # PHASE 3: Mixed players to training courts
        for court in training_courts:
            current_players = db.query(Player).filter(Player.court_id == court.id).count()
            slots_available = 4 - current_players
            
            if slots_available > 0:
                # Mix of advanced and intermediate players for training
                remaining_players = advanced_players + intermediate_players
                players_to_assign = remaining_players[:slots_available]
                
                for player in players_to_assign:
                    if service.assign_player_to_court(player, court):
                        assignments_made.append({
                            "player_name": player.name,
                            "court_name": court.name,
                            "assignment_type": f"{player.qualification.title()} → Training Court"
                        })
                        if player in advanced_players:
                            advanced_players.remove(player)
                        elif player in intermediate_players:
                            intermediate_players.remove(player)
        
        # PHASE 4: Overflow - Advanced players to intermediate courts if needed
        if advanced_players:  # Still have advanced players waiting
            for court in intermediate_courts:
                current_players = db.query(Player).filter(Player.court_id == court.id).count()
                slots_available = 4 - current_players
                
                if slots_available > 0 and advanced_players:
                    players_to_assign = advanced_players[:slots_available]
                    for player in players_to_assign:
                        if service.assign_player_to_court(player, court):
                            assignments_made.append({
                                "player_name": player.name,
                                "court_name": court.name,
                                "assignment_type": "Advanced → Intermediate Court (Overflow)"
                            })
                            advanced_players.remove(player)
        
        # Summary message
        summary = f"Smart assignment completed: {len(assignments_made)} players assigned"
        if advanced_players:
            summary += f" ({len(advanced_players)} advanced players still waiting)"
        if intermediate_players:
            summary += f" ({len(intermediate_players)} intermediate players still waiting)"
        
        return schemas.ApiResponse(
            success=True,
            message=summary,
            data={
                "assignments": assignments_made,
                "remaining_advanced": len(advanced_players),
                "remaining_intermediate": len(intermediate_players)
            }
        )
    
    except Exception as e:
        logger.error(f"Smart assign error: {e}")
        return schemas.ApiResponse(
            success=False,
            message=f"Smart assignment failed: {str(e)}"
        )