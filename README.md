# Badminton Queue System - AI Development Guide

## Architecture Overview

This is a **FastAPI-based badminton court queue management system** with dual entry points:
- `badminton_queue.py` - Production Railway deployment entry point
- `src/main.py` - Development entry point with enhanced database retry logic

**Core Components:**
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL/SQLite
- **Frontend**: Vanilla HTML/CSS/JS with drag-and-drop interface  
- **Database**: Alembic migrations, designed for Railway PostgreSQL deployment
- **Court Layout**: 8 physical courts (G1-G4 "Game" courts, W1-W4 "Warm-up" courts)

## Data Model Patterns

### Key Entities & Relationships
```python
# Players have qualification levels and court assignments
Player.qualification: "advanced" | "intermediate" 
Player.court_id: Optional[int]  # NULL = in queue
Player.is_active: bool  # Must be True to participate

# Courts have types that should match player qualifications
Court.court_type: "advanced" | "intermediate" | "training"  # training allows mixed

# Queue logic: Players with court_id=NULL and is_active=True are "in queue"
```

### Critical Business Logic
- **Queue System**: No dedicated queue tables - players with `court_id=NULL` and `is_active=True` are queued
- **Auto-Assignment**: Sophisticated priority system in `src/api/automation.py`:
  1. Advanced players → Advanced courts
  2. Intermediate players → Intermediate courts  
  3. Mixed players → Training courts
  4. Overflow: Advanced players → Intermediate courts
- **Court Capacity**: Maximum 4 players per court, enforced in assignment logic

## Development Patterns

### Database Configuration
```python
# Dual database support (src/database/database.py)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
# PostgreSQL for production (Railway), SQLite for local development
```

### API Router Structure
All routers follow pattern: `src/api/{entity}.py` with prefixes:
- `/api/players` - Player CRUD, activation, search
- `/api/courts` - Court management, player assignments  
- `/api/queue` - Queue state, player movement
- `/api/automation` - Smart assignment algorithms

### Frontend Integration  
- **Static files**: `static/` directory mounted at `/static`
- **Templates**: Jinja2 templates in `templates/`
- **Drag & Drop**: Complex court/queue interaction via vanilla JS
- **Real-time**: Originally designed for Firebase, now uses REST API polling

## Deployment & Commands

### Railway Deployment
```bash
# Standard Railway deployment
railway up
railway logs

# Manual database migration
railway run alembic upgrade head
```

### Development Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Local development (two options)
uvicorn badminton_queue:app --reload  # Production entry point
uvicorn src.main:app --reload         # Development entry point

# Database migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Railway)
- `PORT` - Server port (auto-set by Railway)

## Common Patterns & Conventions

### Error Handling
- Use FastAPI's `HTTPException` with appropriate status codes
- Database operations wrapped in try/catch with rollback
- Validation happens at both Pydantic schema and business logic levels

### Testing Player Assignment Logic
```python
# Check court capacity before assignment
current_players = db.query(Player).filter(Player.court_id == court_id).count()
if current_players >= 4:
    raise HTTPException(status_code=400, detail="Court is full")

# Validate qualification matching (except training courts)
if court.court_type != "training" and court.court_type != player.qualification:
    raise HTTPException(status_code=400, detail="Qualification mismatch")
```

### Frontend State Management
- Court state managed via DOM manipulation and API calls
- Player drag/drop updates both UI and backend via REST calls
- Queue position handled client-side (no server-side queue ordering)

## Migration & Schema Notes

- **Alembic**: Configured for automatic Railway PostgreSQL URL detection
- **Model Evolution**: Multiple migration files indicate iterative development
- **Naming Convention**: Explicit SQLAlchemy naming convention for consistent constraint names

## Key Files for Context
- `src/api/automation.py` - Complex auto-assignment algorithms
- `src/database/models.py` - Core data relationships  
- `templates/index.html` - Court layout and drag-drop interface
- `RAILWAY_SETUP.md` - Deployment troubleshooting guide
- `badminton_queue.py` vs `src/main.py` - Dual entry point pattern