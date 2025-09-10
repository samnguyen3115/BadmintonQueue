from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

Base = declarative_base()

class QualificationType(str, enum.Enum):
    ADVANCED = "advanced"
    INTERMEDIATE = "intermediate"

class CourtType(str, enum.Enum):
    ADVANCED = "advanced"
    INTERMEDIATE = "intermediate"
    TRAINING = "training"

class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    qualification = Column(String(20), default=QualificationType.INTERMEDIATE)
    is_active = Column(Boolean, default=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    last_updated = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    # Relationships
    queue_entries = relationship("QueueEntry", back_populates="player", cascade="all, delete-orphan")
    court_assignments = relationship("CourtAssignment", back_populates="player", cascade="all, delete-orphan")

class Court(Base):
    __tablename__ = "courts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(10), unique=True, index=True)  # G1, G2, W1, W2, etc.
    court_type = Column(String(20), default=CourtType.INTERMEDIATE)
    
    # Relationships
    assignments = relationship("CourtAssignment", back_populates="court", cascade="all, delete-orphan")

class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    queue_type = Column(String(20))  # advanced or intermediate
    position = Column(Integer)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    player = relationship("Player", back_populates="queue_entries")

class CourtAssignment(Base):
    __tablename__ = "court_assignments"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    court_id = Column(Integer, ForeignKey("courts.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    player = relationship("Player", back_populates="court_assignments")
    court = relationship("Court", back_populates="assignments")
