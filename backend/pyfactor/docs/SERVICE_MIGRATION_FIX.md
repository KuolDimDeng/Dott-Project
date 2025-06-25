# Service Management Database Migration Fix

## Issue
Service creation is failing with a 500 error because the `inventory_service` table in the database is missing the `tenant_id` column required for multi-tenant support.

## Error Details
```
django.db.utils.ProgrammingError: column inventory_service.tenant_id does not exist
LINE 1: SELECT "inventory_service"."tenant_id", "inventory_service"....
```

## Root Cause
The Django migration `0007_add_tenant_to_service.py` exists but hasn't been applied to the production database on Render.

## Solution
Run the pending migration on the backend:

### Option 1: Via Render Shell (Recommended)
1. Go to Render dashboard: https://dashboard.render.com
2. Navigate to the `dott-api` service
3. Click on "Shell" tab
4. Run these commands:
```bash
# Check current migration status
python manage.py showmigrations inventory

# Apply the specific migration
python manage.py migrate inventory 0007_add_tenant_to_service

# Or apply all pending migrations
python manage.py migrate
```

### Option 2: Using the Fix Script
1. In Render shell, run:
```bash
python manage.py shell < scripts/apply_service_tenant_migration.py
```

## Verification
After running the migration, verify it worked:
```sql
-- In Django shell or database console
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'inventory_service' 
AND column_name = 'tenant_id';
```

## Additional Issues Found
1. **Redis Connection Error**: The backend is trying to connect to Redis at `your-redis-host:6379` which doesn't exist. This should be configured properly or disabled if not using Celery.

2. **Missing Dependencies**: Some backend dependencies might be missing for the multi-tenant setup.

## Prevention
- Always run `python manage.py migrate` after deploying model changes
- Consider adding a pre-deployment script to check for pending migrations
- Monitor backend logs for database schema issues

## Related Files
- Migration: `/backend/pyfactor/inventory/migrations/0007_add_tenant_to_service.py`
- Model: `/backend/pyfactor/inventory/models.py` (Service model)
- Fix Script: `/backend/pyfactor/scripts/apply_service_tenant_migration.py`