# Local Backend Testing Workflow

*Last Updated: 2025-07-01*

## Overview

This document outlines the preferred approach for testing Django backend changes locally before deploying to production. This workflow prevents deployment failures and reduces debugging time by catching issues early.

## Why Local Testing is Critical

**Problem**: Multiple deployment failures occurred due to:
- Missing dependencies (debug_toolbar, posthog)
- Django model field errors (created_at vs created)
- Import errors and syntax issues
- Migration conflicts

**Solution**: Test everything locally using Docker Compose before deploying.

## Prerequisites

1. **Docker Desktop** - Must be running
2. **Project Structure** - Ensure you're in `/Users/kuoldeng/projectx/`
3. **Git Branch** - Working on `Dott_Main_Dev_Deploy`

## Local Testing Workflow

### Step 1: Start Support Services
```bash
cd /Users/kuoldeng/projectx
docker-compose up db redis --detach
```

### Step 2: Syntax Validation (Fast Check)
```bash
# Check Python syntax for all model files
python3 -m py_compile taxes/models.py taxes/multistate/models.py taxes/admin.py

# Advanced syntax check with AST parsing
python3 -c "
import ast
files = ['taxes/models.py', 'taxes/multistate/models.py', 'taxes/admin.py']
for file in files:
    with open(file, 'r') as f:
        ast.parse(f.read())
    print(f'✅ {file} - Syntax OK')
print('🎉 All files have valid syntax!')
"
```

### Step 3: Build and Test Backend
```bash
# Build backend with latest changes
docker-compose build backend

# Start backend (will show startup errors immediately)
docker-compose up backend
```

### Step 4: Django Configuration Check
```bash
# Test Django setup and configuration
docker-compose exec backend python manage.py check

# Test specific app configurations
docker-compose exec backend python manage.py check taxes
```

### Step 5: Migration Testing
```bash
# Preview migrations without creating files
docker-compose exec backend python manage.py makemigrations --dry-run

# Generate migration files
docker-compose exec backend python manage.py makemigrations

# Preview migration execution without applying
docker-compose exec backend python manage.py migrate --dry-run

# Test migration on local database
docker-compose exec backend python manage.py migrate
```

### Step 6: Model Validation
```bash
# Test model imports and field validation
docker-compose exec backend python test_models.py
```

### Step 7: Deploy with Confidence
```bash
# Only after all local tests pass
git add .
git commit -m "Your change description

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin Dott_Main_Dev_Deploy
```

## Troubleshooting Common Issues

### Issue: Docker daemon not running
```bash
# Start Docker Desktop
open -a Docker
# Wait for Docker to start, then retry
```

### Issue: Missing dependencies
```bash
# Add to requirements-render.txt, then rebuild
docker-compose build backend --no-cache
```

### Issue: Database connection failures
```bash
# Ensure services are running
docker-compose ps
# Restart if needed
docker-compose restart db redis
```

### Issue: Migration conflicts
```bash
# Merge migrations locally
docker-compose exec backend python manage.py makemigrations --merge
```

## Quick Reference Commands

| Task | Command |
|------|---------|
| **Syntax Check** | `python3 -m py_compile *.py` |
| **Start Services** | `docker-compose up db redis -d` |
| **Build Backend** | `docker-compose build backend` |
| **Test Django** | `docker-compose exec backend python manage.py check` |
| **Test Migrations** | `docker-compose exec backend python manage.py makemigrations --dry-run` |
| **Clean Restart** | `docker-compose down && docker-compose up --build` |

## Benefits of This Approach

### ✅ **Prevents Deployment Failures**
- Catch syntax errors in seconds vs. minutes
- Validate Django configuration before deployment
- Test migrations on identical environment

### ✅ **Faster Development Cycle**
- Immediate feedback on changes
- No waiting for Render deployment
- Debug locally with full tools

### ✅ **Production Safety**
- Same environment as production (Docker)
- All dependencies included
- Database migrations tested first

### ✅ **Team Collaboration**
- Consistent testing environment
- Documented workflow
- Reproducible builds

## Integration with CI/CD

This workflow integrates with the existing deployment pipeline:

1. **Local Testing** (This document)
2. **Git Push** to `Dott_Main_Dev_Deploy`
3. **Render Auto-Deploy** picks up changes
4. **Production Migration** in Render shell (safe because pre-tested)

## Files Created/Modified

- `test_models.py` - Model validation script
- `docker-compose.yml` - Local development environment
- `requirements-render.txt` - Added missing dependencies
- This documentation

## Version History

- **v1.0** (2025-07-01) - Initial workflow documentation
- Created after resolving multiple deployment failures
- Implements Docker-based local testing approach
- Includes migration testing and syntax validation

---

**Note**: This workflow should be used for ALL backend changes going forward. The investment in local testing saves significant time and prevents production issues.