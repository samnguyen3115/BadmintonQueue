from sqlalchemy.orm import relationship, DeclarativeBase, Mapped, mapped_column
from sqlalchemy import TIMESTAMP, Integer, MetaData, String, ForeignKey, DateTime, Float
from datetime import datetime
from sqlalchemy.sql import func

class Base(DeclarativeBase):
    metadata = MetaData(naming_convention={
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    })


class Player(Base):
    __tablename__ = "players"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    qualification : Mapped[str] = mapped_column(String(255), nullable=False)
    is_active : Mapped[bool] = mapped_column(nullable=False,default=False)
    
    court_id: Mapped[int | None] = mapped_column(ForeignKey("courts.id"), nullable=True)
    court: Mapped["Court"] = relationship("Court", back_populates="players")
    
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True)
    team: Mapped["Team"] = relationship("Team", back_populates="players")
    
    # Add relationship to court assignments
    court_assignments: Mapped[list["CourtAssignment"]] = relationship("CourtAssignment", back_populates="player")


class Court(Base):
    __tablename__ = "courts"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    court_type: Mapped[str] = mapped_column(String(255), nullable=False,default= "training")
    players: Mapped[list["Player"]] = relationship("Player", back_populates="court")
    
    # Add relationship to court assignments
    assignments: Mapped[list["CourtAssignment"]] = relationship("CourtAssignment", back_populates="court")


class Team(Base):
    __tablename__ = "teams"
    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(255), nullable=False)
    
    players: Mapped[list["Player"]] = relationship("Player", back_populates="team")


class CourtAssignment(Base):
    __tablename__ = "court_assignments"
    id: Mapped[int] = mapped_column(primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False)
    court_id: Mapped[int] = mapped_column(ForeignKey("courts.id"), nullable=False)
    timestamp: Mapped[DateTime] = mapped_column(DateTime, default=func.now())
    
    # Relationships
    player: Mapped["Player"] = relationship("Player", back_populates="court_assignments")
    court: Mapped["Court"] = relationship("Court", back_populates="assignments")