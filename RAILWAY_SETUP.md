# Railway Deployment Setup

## Steps to fix the PostgreSQL connection issue:

### 1. Railway Environment Variables
Make sure these environment variables are set in your Railway project:
- `DATABASE_URL` - This should be automatically set by Railway when you add a PostgreSQL service

### 2. Add PostgreSQL Service
In your Railway dashboard:
1. Go to your project
2. Click "Add Service" 
3. Select "PostgreSQL"
4. Railway will automatically set the `DATABASE_URL` environment variable

### 3. Deploy Commands
```bash
# Deploy to Railway
railway up

# Check logs
railway logs

# Connect to your Railway project (if not already connected)
railway login
railway link
```

### 4. Database Migration
The app will automatically run migrations on startup. If you need to run them manually:
```bash
railway run alembic upgrade head
```

### 5. Troubleshooting
- Make sure PostgreSQL service is running in Railway
- Check that DATABASE_URL environment variable is set correctly
- View logs with `railway logs` to see detailed error messages
- Ensure your Railway project has sufficient resources

## Files Updated:
- `src/database/database.py` - Enhanced PostgreSQL connection handling
- `alembic/env.py` - Updated to use environment variables
- `railway.json` - Railway deployment configuration
- `nixpacks.toml` - Build configuration
- `Procfile` - Deployment command
- `src/main.py` - Improved database initialization with retry logic