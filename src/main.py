from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging
from dotenv import load_dotenv
import psycopg2
from sqlalchemy import inspect
from sqlalchemy.exc import OperationalError

from .database.database import engine, Base, SessionLocal

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Badminton Queue System",
    description="API for managing badminton courts and player queues",
    version="1.0.0"
)

# Try to create database tables with better error handling
def init_database():
    """Initialize database with retry logic for Railway deployment"""
    import time
    max_retries = 5
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Database initialization attempt {attempt + 1}...")
            
            # Test database connection
            with engine.connect() as connection:
                logger.info("Database connection successful!")
            
            # Create tables if they don't exist
            logger.info("Creating database tables...")
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully!")
            return True
            
        except OperationalError as e:
            logger.warning(f"Database connection failed (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error("Failed to connect to database after all retries")
                raise e
        except Exception as e:
            logger.error(f"Unexpected error during database setup: {e}")
            raise e
    
    return False

# Initialize database
init_database()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import API routers
from .api import players, courts, queue, auth

# Include routers with API prefixes
app.include_router(auth.auth_router, prefix="/api/auth")
app.include_router(players.player_router, prefix="/api/players")
app.include_router(courts.court_router, prefix="/api/courts")
app.include_router(queue.queue_router, prefix="/api/queue")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    # Serve the main HTML page
    from fastapi.responses import FileResponse
    return FileResponse('templates/index.html')

@app.get("/login")
async def login_page():
    # Serve the login page
    from fastapi.responses import FileResponse
    return FileResponse('templates/login.html')

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

# If running this script directly
if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run("src.main:app", host=host, port=port, reload=True)
