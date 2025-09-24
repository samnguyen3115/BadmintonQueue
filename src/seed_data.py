from datetime import datetime, timedelta
import os
from sqlalchemy.orm import Session
from alembic import op
import sqlalchemy as sa
from faker import Faker

# Import models
from src.models.models import Base, Player, Court, QueueEntry, CourtAssignment
from src.database.database import SessionLocal, engine

# Create Faker instance
fake = Faker()

def create_demo_data():
    # Create database tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Create a session
    db = SessionLocal()
    
    try:
        # Create players
        advanced_players = []
        for i in range(10):
            player = Player(
                name=fake.name(),
                email=fake.email(),
                qualification="advanced",
                is_active=True,
                created_at=datetime.now() - timedelta(days=fake.random_int(min=1, max=30)),
                updated_at=datetime.now()
            )
            db.add(player)
            advanced_players.append(player)
        
        intermediate_players = []
        for i in range(15):
            player = Player(
                name=fake.name(),
                email=fake.email(),
                qualification="intermediate",
                is_active=True if fake.boolean(chance_of_getting_true=70) else False,
                created_at=datetime.now() - timedelta(days=fake.random_int(min=1, max=30)),
                updated_at=datetime.now()
            )
            db.add(player)
            intermediate_players.append(player)
        
        db.commit()
        
        # Create courts
        advanced_courts = []
        for i in range(2):
            court = Court(
                name=f"Advanced Court {i+1}",
                court_type="advanced",
                is_active=True,
                created_at=datetime.now() - timedelta(days=fake.random_int(min=1, max=10)),
                updated_at=datetime.now()
            )
            db.add(court)
            advanced_courts.append(court)
        
        intermediate_courts = []
        for i in range(3):
            court = Court(
                name=f"Intermediate Court {i+1}",
                court_type="intermediate",
                is_active=True,
                created_at=datetime.now() - timedelta(days=fake.random_int(min=1, max=10)),
                updated_at=datetime.now()
            )
            db.add(court)
            intermediate_courts.append(court)
        
        db.commit()
        
        # Create queue entries for some players
        position = 1
        for player in advanced_players[:5]:
            queue_entry = QueueEntry(
                player_id=player.id,
                queue_type="advanced",
                position=position,
                created_at=datetime.now() - timedelta(minutes=fake.random_int(min=5, max=60))
            )
            db.add(queue_entry)
            position += 1
        
        position = 1
        for player in intermediate_players[:7]:
            if player.is_active:
                queue_entry = QueueEntry(
                    player_id=player.id,
                    queue_type="intermediate",
                    position=position,
                    created_at=datetime.now() - timedelta(minutes=fake.random_int(min=5, max=60))
                )
                db.add(queue_entry)
                position += 1
        
        db.commit()
        
        # Assign some players to courts
        # Advanced courts (4 players per court)
        for i, court in enumerate(advanced_courts):
            start_idx = i * 4
            end_idx = start_idx + 4
            for player in advanced_players[start_idx:end_idx]:
                if player.is_active:
                    court_assignment = CourtAssignment(
                        court_id=court.id,
                        player_id=player.id,
                        created_at=datetime.now() - timedelta(minutes=fake.random_int(min=5, max=30))
                    )
                    db.add(court_assignment)
        
        # Intermediate courts (4 players per court)
        for i, court in enumerate(intermediate_courts):
            start_idx = i * 4
            end_idx = start_idx + 4
            for player in intermediate_players[start_idx:end_idx]:
                if player.is_active:
                    court_assignment = CourtAssignment(
                        court_id=court.id,
                        player_id=player.id,
                        created_at=datetime.now() - timedelta(minutes=fake.random_int(min=5, max=30))
                    )
                    db.add(court_assignment)
        
        db.commit()
        
        pass
    
    finally:
        db.close()

if __name__ == "__main__":
    create_demo_data()
