import os
from pathlib import Path

# Create project directory structure
project_root = Path.cwd()

# Create main directories
directories = [
    "src",
    "src/api",
    "src/database",
    "src/models",
    "tests",
    "static",
    "templates"
]

for directory in directories:
    os.makedirs(directory, exist_ok=True)

# Create a requirements.txt file
with open("requirements.txt", "w") as f:
    f.write("""fastapi==0.104.1
uvicorn==0.23.2
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
python-dotenv==1.0.0
pydantic==2.4.2
pydantic[email]==2.4.2
alembic==1.12.1
pytest==7.4.3
httpx==0.25.1
""")

# Create a .env file
with open(".env", "w") as f:
    f.write("""DATABASE_URL=postgresql://postgres:password@localhost/badminton_queue
HOST=127.0.0.1
PORT=8000
""")

# Create a README.md file
with open("README.md", "w") as f:
    f.write("""# Badminton Queue System

A FastAPI application to manage badminton courts and player queues.

## Features

- Player management
- Court management
- Queue system for advanced and intermediate players
- Court assignments
- REST API

## Installation

1. Clone the repository
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\\Scripts\\activate`
   - Linux/Mac: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Configure your database in `.env` file
6. Run database migrations: `alembic upgrade head`
7. Start the server: `uvicorn src.main:app --reload`

## API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc
""")

# Create a .gitignore file
with open(".gitignore", "w") as f:
    f.write("""# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environment
venv/
ENV/
env/

# IDE
.idea/
.vscode/
*.swp
*.swo

# Environment variables
.env

# Logs
logs/
*.log

# Database
*.sqlite3

# OS specific
.DS_Store
Thumbs.db
""")

print("Project structure created successfully!")
