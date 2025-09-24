from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database.database import get_db
from ..database.models import Player, Court

queue_router = APIRouter(tags=["Queue Management"])


def move_player_to_queue_internal(player_id: int, db: Session, qualification: str = None):
    """Internal function to move a player from court to queue"""
    player = db.query(Player).filter(Player.id == player_id, Player.is_active == True).first()
    if not player:
        raise ValueError(f"Active player with ID {player_id} not found")

    # Remove from court
    old_court_id = player.court_id
    player.court_id = None
    db.commit()

    # Change qualification if provided
    if qualification and qualification in ["advanced", "intermediate"]:
        old_qualification = player.qualification
        player.qualification = qualification

        return {
            "message": f"Player {player.name} moved to {qualification} queue",
            "player": {"id": player.id, "name": player.name, "qualification": player.qualification},
            "changes": {
                "removed_from_court": old_court_id,
                "qualification_changed": old_qualification != qualification
            }
        }
    else:
        return {
            "message": f"Player {player.name} moved to queue",
            "player": {"id": player.id, "name": player.name, "qualification": player.qualification},
            "changes": {
                "removed_from_court": old_court_id,
                "qualification_changed": False
            }
        }


async def auto_fill_courts(db: Session):
    """Automatically fill empty court spots with players from warmup courts first, then queues"""
    try:
        # Get all courts
        courts = db.query(Court).all()
        assignments_made = []

        # Court mapping: Game court -> Warmup court
        warmup_mapping = {
            'G1': 'W1', 'G2': 'W2', 'G3': 'W3', 'G4': 'W4'
        }

        # Sort courts to prioritize G courts first, then W courts
        g_courts = [c for c in courts if c.name.startswith('G')]
        w_courts = [c for c in courts if c.name.startswith('W')]
        other_courts = [c for c in courts if not c.name.startswith('G') and not c.name.startswith('W')]
        
        # Process courts in order: G courts first, then W courts, then others
        prioritized_courts = g_courts + w_courts + other_courts

        for court in prioritized_courts:
            if court.court_type != "training":
                current_players = db.query(Player).filter(
                    Player.court_id == court.id).count()
                available_spots = 4 - current_players

                if available_spots > 0:
                    available_players = []

                    # Step 1: Check warmup court first (if this is a G court)
                    if court.name in warmup_mapping:
                        warmup_court_name = warmup_mapping[court.name]
                        warmup_court = db.query(Court).filter(Court.name == warmup_court_name).first()
                        
                        if warmup_court:
                            # Get players from warmup court that match court type requirements
                            if court.court_type == "advanced":
                                # Advanced courts ONLY accept advanced players
                                warmup_players = db.query(Player).filter(
                                    Player.court_id == warmup_court.id,
                                    Player.qualification == "advanced",
                                    Player.is_active == True
                                ).limit(available_spots).all()
                            elif court.court_type == "intermediate":
                                # Intermediate courts ONLY accept intermediate players
                                warmup_players = db.query(Player).filter(
                                    Player.court_id == warmup_court.id,
                                    Player.qualification == "intermediate",
                                    Player.is_active == True
                                ).limit(available_spots).all()
                            else:
                                # Skip training courts completely
                                warmup_players = []
                            
                            available_players.extend(warmup_players)
                            
                            # Cascade: If we took players from W court, immediately fill W court from queue
                            if warmup_players and warmup_court.court_type != "training":
                                w_spots_needed = len(warmup_players)
                                
                                if warmup_court.court_type == "advanced":
                                    # Fill W court with advanced players from queue
                                    queue_to_w_players = db.query(Player).filter(
                                        Player.court_id.is_(None),
                                        Player.qualification == "advanced",
                                        Player.is_active == True
                                    ).limit(w_spots_needed).all()
                                elif warmup_court.court_type == "intermediate":
                                    # Fill W court with intermediate players from queue
                                    queue_to_w_players = db.query(Player).filter(
                                        Player.court_id.is_(None),
                                        Player.qualification == "intermediate",
                                        Player.is_active == True
                                    ).limit(w_spots_needed).all()
                                else:
                                    queue_to_w_players = []
                                
                                # Move queue players to W court
                                for player in queue_to_w_players:
                                    player.court_id = warmup_court.id
                                    assignments_made.append({
                                        "player": {"id": player.id, "name": player.name, "qualification": player.qualification},
                                        "court": {"id": warmup_court.id, "name": warmup_court.name, "type": warmup_court.court_type},
                                        "source": "queue_cascade"
                                    })

                    # Step 2: Fill remaining spots from queue (for both G and W courts)
                    remaining_spots = available_spots - len(available_players)
                    if remaining_spots > 0:
                        if court.court_type == "advanced":
                            # Advanced courts ONLY accept advanced players from queue
                            queue_players = db.query(Player).filter(
                                Player.court_id.is_(None),
                                Player.qualification == "advanced",
                                Player.is_active == True
                            ).limit(remaining_spots).all()
                            available_players.extend(queue_players)
                        elif court.court_type == "intermediate":
                            # Intermediate courts ONLY accept intermediate players from queue
                            queue_players = db.query(Player).filter(
                                Player.court_id.is_(None),
                                Player.qualification == "intermediate",
                                Player.is_active == True
                            ).limit(remaining_spots).all()
                            available_players.extend(queue_players)
                        # Skip training courts - no auto-fill

                    # Assign all selected players to the court
                    for player in available_players:
                        source = "warmup" if player.court_id is not None else "queue"
                        player.court_id = court.id
                        assignments_made.append({
                            "player": {"id": player.id, "name": player.name, "qualification": player.qualification},
                            "court": {"id": court.id, "name": court.name, "type": court.court_type},
                            "source": source
                        })

        if assignments_made:
            db.commit()
        return assignments_made

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error auto-filling courts: {str(e)}")


@queue_router.get("/queues", response_model=dict)
async def get_all_queues(db: Session = Depends(get_db)):
    """Get all players organized by queue type"""
    try:
        # Get all active players not assigned to courts (court_id is None)
        queued_players = db.query(Player).filter(
            Player.court_id.is_(None),
            Player.is_active == True
        ).all()

        advanced_queue = [
            {"id": p.id, "name": p.name, "qualification": p.qualification}
            for p in queued_players if p.qualification == "advanced"
        ]

        intermediate_queue = [
            {"id": p.id, "name": p.name, "qualification": p.qualification}
            for p in queued_players if p.qualification == "intermediate"
        ]

        return {
            "advanced": advanced_queue,
            "intermediate": intermediate_queue,
            "total_queued": len(queued_players)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting queues: {str(e)}")


@queue_router.post("/move-to-court/{player_id}/{court_id}")
async def move_player_to_court(player_id: int, court_id: int, db: Session = Depends(get_db)):
    """Move a player from queue to a court"""
    try:
        # Get active player and court
        player = db.query(Player).filter(Player.id == player_id, Player.is_active == True).first()
        court = db.query(Court).filter(Court.id == court_id).first()

        if not player:
            raise HTTPException(status_code=404, detail="Active player not found")
        if not court:
            raise HTTPException(status_code=404, detail="Court not found")

        # Check court capacity (max 4 players)
        court_players = db.query(Player).filter(
            Player.court_id == court_id).count()
        if court_players >= 4:
            raise HTTPException(
                status_code=400, detail="Court is full (max 4 players)")

        # Check if player qualification matches court type for advanced courts
        if court.court_type == "advanced" and player.qualification != "advanced":
            raise HTTPException(
                status_code=400, detail="Only advanced players can be assigned to advanced courts")

        # Assign player to court
        player.court_id = court_id
        db.commit()

        return {
            "message": f"Player {player.name} moved to court {court.name}",
            "player": {"id": player.id, "name": player.name, "qualification": player.qualification},
            "court": {"id": court.id, "name": court.name}
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error moving player: {str(e)}")


@queue_router.post("/move-to-queue/{player_id}")
async def move_player_to_queue(player_id: int, qualification: str = None, db: Session = Depends(get_db)):
    """Move a player from court to queue, optionally changing qualification"""
    try:
        result = move_player_to_queue_internal(player_id, db, qualification)
        db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error moving player to queue: {str(e)}")


@queue_router.get("/court-players/{court_id}")
async def get_court_players(court_id: int, db: Session = Depends(get_db)):
    """Get all players assigned to a specific court"""
    try:
        court = db.query(Court).filter(Court.id == court_id).first()
        if not court:
            raise HTTPException(status_code=404, detail="Court not found")

        players = db.query(Player).filter(Player.court_id == court_id, Player.is_active == True).all()

        return {
            "court": {"id": court.id, "name": court.name, "type": court.court_type},
            "players": [
                {"id": p.id, "name": p.name, "qualification": p.qualification}
                for p in players
            ],
            "count": len(players),
            "capacity_remaining": 4 - len(players)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting court players: {str(e)}")


@queue_router.post("/auto-fill-courts")
async def auto_fill_courts_endpoint(db: Session = Depends(get_db)):
    """Manually trigger auto-fill of courts with queued players"""
    try:
        assignments = await auto_fill_courts(db)

        if assignments:
            return {
                "message": f"Successfully auto-filled {len(assignments)} player assignments",
                "assignments": assignments
            }
        else:
            return {
                "message": "No auto-fill assignments needed - all courts are full or no players in queue",
                "assignments": []
            }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error auto-filling courts: {str(e)}")


@queue_router.post("/refresh-all")
async def refresh_all_data(db: Session = Depends(get_db)):
    """Get complete app state - all queues and courts with players, with auto-fill"""
    try:
        # Auto-fill courts before returning data
        auto_assignments = await auto_fill_courts(db)

        # Get queue data
        queues_response = await get_all_queues(db)

        # Get all courts with their players
        courts = db.query(Court).all()
        courts_data = []
        print(auto_assignments)
        print(queues_response)
        for court in courts:
            court_response = await get_court_players(court.id, db)
            courts_data.append(court_response)

        return {
            "queues": queues_response,
            "courts": courts_data,
            "auto_assignments": auto_assignments,
            "timestamp": "refreshed"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error refreshing data: {str(e)}")


@queue_router.post("/start-new-session")
async def start_new_session(db: Session = Depends(get_db)):
    """Start a new session: deactivate all players and set all courts to training"""
    try:
        # Deactivate all players and remove them from courts
        players = db.query(Player).all()
        deactivated_count = 0
        for player in players:
            if player.is_active:
                player.is_active = False
                player.court_id = None  # Remove from court
                deactivated_count += 1

        # Set all courts to training type
        courts = db.query(Court).all()
        training_count = 0
        for court in courts:
            if court.court_type != "training":
                court.court_type = "training"
                training_count += 1

        db.commit()

        return {
            "message": f"New session started successfully",
            "players_deactivated": deactivated_count,
            "courts_set_to_training": training_count,
            "total_players": len(players),
            "total_courts": len(courts)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error starting new session: {str(e)}")
