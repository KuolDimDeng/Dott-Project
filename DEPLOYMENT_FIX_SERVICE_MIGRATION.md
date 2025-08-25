# URGENT: Fix Service Management Database Issue

## Problem
Service Management is failing with 503 errors because the database is missing the `customer_id` column in the `inventory_service` table. The migration file exists but hasn't been applied to staging/production.

## Error Details
```
ProgrammingError: column inventory_service.customer_id does not exist
LINE 1: ...ventory_service"."is_active", "inventory_service"."customer...
```

## Solution
Apply migration `0016_add_customer_to_service` to add the missing database columns.

## Quick Fix for Staging

### Option 1: Use the Quick Fix Script (Recommended)
```bash
# SSH into staging server
# Navigate to backend directory
cd /app

# Run the quick fix
python scripts/quick_migration_fix.py
```

### Option 2: Manual Commands
```bash
# Check current status
python manage.py showmigrations inventory | grep 0016

# Apply the migration
python manage.py migrate inventory 0016

# Verify it worked
python manage.py shell -c "from django.db import connection; cursor = connection.cursor(); cursor.execute('SELECT column_name FROM information_schema.columns WHERE table_name=\\'inventory_service\\' AND column_name=\\'customer_id\\';'); print('Column exists:', bool(cursor.fetchone()))"
```

## Deployment Steps (Detailed)

### 1. Check Current Status (Production Server)
```bash
cd /app
python scripts/apply_service_migration.py --check
```

### 2. Apply Migration (Production Server)
```bash
# Option A: Use the script
python scripts/apply_service_migration.py --apply

# Option B: Direct Django command
python manage.py migrate inventory 0016
```

### 3. Verify Fix
```bash
# Check database directly
python manage.py dbshell
\d inventory_service
# Look for customer_id column

# Or use the script
python scripts/apply_service_migration.py --check
```

### 4. Test Service Management
- Go to Dashboard → Service Management
- Should load without 503 errors
- Try creating/editing a service

## Migration Details
The migration adds three fields to the Service model:
- `customer_id`: ForeignKey to CRM Customer (nullable)
- `next_invoice_date`: Date field for recurring billing
- `last_invoice_date`: Date field for tracking

## Files Involved
- Migration: `/backend/pyfactor/inventory/migrations/0016_add_customer_to_service.py`
- Script: `/backend/pyfactor/scripts/apply_service_migration.py`
- Frontend: `/frontend/pyfactor_next/src/app/dashboard/components/forms/ServiceManagement.js`
- API Proxy: `/frontend/pyfactor_next/src/app/api/inventory/services/route.js`

## Notes
- This is a safe migration that only adds columns (no data loss)
- The columns are nullable so existing records won't be affected
- The frontend JavaScript scope issue has already been fixed and deployed