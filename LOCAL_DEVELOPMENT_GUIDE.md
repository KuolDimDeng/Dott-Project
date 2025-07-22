# Local Development Environment Setup

This guide helps you create a complete local development environment that mirrors your production Render setup.

## Overview

Your local environment will include:
- **Frontend**: Next.js on `http://localhost:3000`
- **Backend**: Django on `http://localhost:8000` 
- **Database**: PostgreSQL on `localhost:5432`
- **Cache**: Redis on `localhost:6379`

## Prerequisites

1. **Docker Desktop** - Download and install from [docker.com](https://docker.com)
2. **Git** - Make sure your project is cloned locally
3. **API Keys** - Gather your production environment variables from Render

## Quick Setup

### 1. Current Status: Frontend Working! ✅

**✅ WORKING NOW:**
- **Frontend**: http://localhost:3000 - Your complete Dott landing page
- **Database**: PostgreSQL on localhost:5432 - Ready for data
- **Redis**: Session storage on localhost:6379 - Ready for sessions

**🔧 IN PROGRESS:**
- **Backend**: Django API on localhost:8000 - Migration fixes needed

**🎯 What You Can Do:**
- View your complete landing page at http://localhost:3000
- Make frontend changes and see them instantly with hot reload
- Test responsive design and translations
- Test all static content and UI components

### 2. Start Services
```bash
cd /Users/kuoldeng/projectx
docker-compose -f docker-compose.local.yml up -d
```

### 2. Configure Environment Variables

Edit `.env.local` with your actual values from Render:

```bash
# Copy from your Render backend environment
AUTH0_CLIENT_SECRET=your-actual-secret
CLAUDE_API_KEY=sk-ant-api03-your-key
STRIPE_SECRET_KEY=sk_test_your-key
# ... etc
```

### 3. Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin
- **Login**: admin@dottapps.com / admin123

## Manual Setup (Alternative)

If you prefer manual setup:

### 1. Create Environment File
```bash
cp .env.local.example .env.local
# Edit .env.local with your values
```

### 2. Start Services
```bash
docker-compose -f docker-compose.local.yml up --build
```

### 3. Run Migrations (in another terminal)
```bash
docker-compose -f docker-compose.local.yml exec backend python manage.py migrate
```

### 4. Create Admin User
```bash
docker-compose -f docker-compose.local.yml exec backend python manage.py createsuperuser
```

### 5. Load Sample Data
```bash
docker-compose -f docker-compose.local.yml exec backend python manage.py shell < scripts/seed_local_data.py
```

## Development Workflow

### Making Changes

1. **Frontend Changes**: 
   - Edit files in `frontend/pyfactor_next/src/`
   - Hot reloading enabled - changes appear instantly
   - View at http://localhost:3000

2. **Backend Changes**:
   - Edit files in `backend/pyfactor/`
   - Django auto-reloads on file changes
   - API available at http://localhost:8000

3. **Database Changes**:
   - Create migrations: `docker-compose -f docker-compose.local.yml exec backend python manage.py makemigrations`
   - Apply migrations: `docker-compose -f docker-compose.local.yml exec backend python manage.py migrate`

### Testing Before Deploy

This local environment matches your production setup, so you can:
- Test full user workflows
- Verify API integrations
- Check database operations
- Test payment flows (with Stripe test keys)
- Validate translations
- Test responsive design

### Deploy When Ready

Once you're satisfied with local testing:
```bash
git add .
git commit -m "Your descriptive commit message"
git push origin Dott_Main_Dev_Deploy
```

Render will automatically deploy your changes.

## Useful Commands

### Service Management
```bash
# View logs
docker-compose -f docker-compose.local.yml logs -f

# View specific service logs
docker-compose -f docker-compose.local.yml logs -f frontend
docker-compose -f docker-compose.local.yml logs -f backend

# Restart services
docker-compose -f docker-compose.local.yml restart

# Stop all services
docker-compose -f docker-compose.local.yml down

# Stop and remove volumes (fresh start)
docker-compose -f docker-compose.local.yml down -v
```

### Database Operations
```bash
# Access PostgreSQL
docker-compose -f docker-compose.local.yml exec db psql -U dott_user -d dott_local

# Run Django shell
docker-compose -f docker-compose.local.yml exec backend python manage.py shell

# Create database backup
docker-compose -f docker-compose.local.yml exec db pg_dump -U dott_user dott_local > backup.sql

# Restore database
docker-compose -f docker-compose.local.yml exec -T db psql -U dott_user -d dott_local < backup.sql
```

### Backend Operations
```bash
# Run Django management commands
docker-compose -f docker-compose.local.yml exec backend python manage.py <command>

# Install new Python packages
docker-compose -f docker-compose.local.yml exec backend pip install <package>
docker-compose -f docker-compose.local.yml exec backend pip freeze > requirements.txt

# Run tests
docker-compose -f docker-compose.local.yml exec backend python manage.py test
```

### Frontend Operations
```bash
# Install new npm packages
docker-compose -f docker-compose.local.yml exec frontend pnpm add <package>

# Run build
docker-compose -f docker-compose.local.yml exec frontend pnpm build

# Run tests
docker-compose -f docker-compose.local.yml exec frontend pnpm test
```

## Sample Data

The setup includes test accounts:
- **Owner**: owner@testcompany.com / testpass123
- **Admin**: admin@testcompany.com / testpass123  
- **User**: user@testcompany.com / testpass123

And sample business data:
- Test Company Inc
- Sample invoices and expenses
- Geofencing zones (if configured)

## Troubleshooting

### Common Issues

1. **Docker not running**: 
   - Error: `Cannot connect to the Docker daemon`
   - Fix: Start Docker Desktop application

2. **Port conflicts**:
   - Error: `bind: address already in use`
   - Fix: Kill conflicting process or change ports in docker-compose.local.yml
   ```bash
   # Find what's using port 3000
   lsof -i :3000
   # Kill the process
   kill -9 <PID>
   ```

3. **Environment variables not loading**:
   - Error: Services fail to start
   - Fix: Ensure .env.local exists and has correct format
   ```bash
   cp .env.local.example .env.local
   # Edit with your actual values
   ```

4. **Backend migration error**:
   - Error: `NodeNotFoundError: Migration custom_auth.0027_passwordresettoken`
   - Current Status: Known issue - frontend still works
   - Workaround: Use frontend at http://localhost:3000 for UI development

5. **Docker build failures**:
   - Error: `cannot copy to non-directory`
   - Fix: Clean Docker cache and rebuild
   ```bash
   docker-compose -f docker-compose.local.yml down --volumes
   docker system prune -f
   docker-compose -f docker-compose.local.yml up --build
   ```

6. **Frontend not hot-reloading**:
   - Fix: Restart just the frontend service
   ```bash
   docker-compose -f docker-compose.local.yml restart frontend
   ```

7. **Out of disk space**:
   - Error: `no space left on device`
   - Fix: Clean up Docker resources
   ```bash
   docker system prune -a --volumes
   ```

### Performance Issues

- **Slow startup**: Initial build takes longer, subsequent starts are faster
- **High memory usage**: Docker Desktop settings - increase memory allocation
- **File watching issues**: On Windows/WSL, you may need to increase file watchers

### Getting Help

1. Check service logs: `docker-compose -f docker-compose.local.yml logs <service>`
2. Verify all services running: `docker-compose -f docker-compose.local.yml ps`
3. Check your .env.local file has all required variables
4. Ensure Docker Desktop has enough resources allocated

## Production Parity

This local environment maintains parity with production by:
- ✅ Same database (PostgreSQL)
- ✅ Same session storage (Redis)
- ✅ Same authentication (Auth0)
- ✅ Same payment processing (Stripe)
- ✅ Same API integrations (Claude, WhatsApp)
- ✅ Same build processes
- ✅ Same environment variables structure

The only differences:
- Debug mode enabled
- Test API keys used
- Local file serving instead of CDN
- Reduced security headers (for development ease)

This ensures what works locally will work in production!