# Staging Login Fix - URGENT

## Issue
The staging server is missing the `onboarding_completed_at` column in the database, causing all login attempts to fail with "Internal server error".

## Quick Fix (Run on Staging Server)

### Option 1: Python Script (Recommended)
```bash
# SSH into staging backend
cd /app
python scripts/apply_staging_migration_fix.py
```

### Option 2: Direct SQL
```bash
# Connect to staging database
psql $DATABASE_URL

# Run the SQL fix
\i scripts/fix_staging_onboarding_column.sql
```

### Option 3: Django Migration
```bash
# If migrations are working properly
python manage.py migrate custom_auth
```

## Root Cause
The migration `0009_user_onboarding_completed` wasn't applied to staging, but the code expects the `onboarding_completed_at` column to exist.

## Prevention
Always run migrations after deployment:
1. Deploy code
2. Run `python manage.py migrate`
3. Verify with `python manage.py showmigrations`