from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class QualificationType(str, Enum):
    ADVANCED = "A"
    INTERMEDIATE = "I"

class CourtType(str, Enum):
    ADVANCED = "advanced"
    INTERMEDIATE = "intermediate"
    TRAINING = "training"

class PlayerBase(BaseModel):
    name: str
    qualification: QualificationType = QualificationType.INTERMEDIATE

class PlayerCreate(PlayerBase):
    pass

class Player(PlayerBase):
    id: int

    class Config:
        from_attributes = True

class CourtBase(BaseModel):
    name: str

class CourtCreate(CourtBase):
    pass

class Court(CourtBase):
    id: int
    
    class Config:
        from_attributes = True

class QueueEntryBase(BaseModel):
    player_id: int
    queue_type: str
    position: int

class QueueEntryCreate(QueueEntryBase):
    pass

class QueueEntry(QueueEntryBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

class CourtAssignmentBase(BaseModel):
    player_id: int
    court_id: int

class CourtAssignmentCreate(CourtAssignmentBase):
    pass

class CourtAssignment(CourtAssignmentBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

class CourtWithPlayers(Court):
    players: List[Player] = []
    
    class Config:
        from_attributes = True

class QueueInfo(BaseModel):
    advanced_queue: List[Player] = []
    intermediate_queue: List[Player] = []

class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
