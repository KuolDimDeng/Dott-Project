# Staging Migration Fix Instructions

## Current Issue
Service Management is not working on staging due to missing database column `customer_id` in the `inventory_service` table.

## How to Fix on Staging Server

### Step 1: SSH into Staging Server
```bash
# Use your SSH credentials to connect to the staging server
ssh [your-staging-server]
```

### Step 2: Navigate to Backend Directory
```bash
cd /app
# or wherever the Django app is deployed
```

### Step 3: Run the Migration Fix
```bash
# Option A: Use the quick fix script (RECOMMENDED)
python scripts/quick_migration_fix.py

# Option B: Apply migration directly
python manage.py migrate inventory 0016

# Option C: Apply all pending migrations
python manage.py migrate
```

### Step 4: Verify the Fix
```bash
# Check if migration is applied
python manage.py showmigrations inventory | grep 0016

# Should show: [X] 0016_add_customer_to_service
```

### Step 5: Test Service Management
1. Go to https://staging.dottapps.com
2. Navigate to Dashboard → Service Management
3. Should load without errors
4. Try creating or editing a service

## What This Migration Does
- Adds `customer_id` field to link services to customers
- Adds `next_invoice_date` for recurring billing
- Adds `last_invoice_date` for tracking

## Files Deployed to Staging
- `/backend/pyfactor/scripts/quick_migration_fix.py` - Auto-fix script
- `/backend/pyfactor/scripts/check_service_migration.sh` - Status checker
- `/backend/pyfactor/scripts/apply_service_migration.py` - Detailed migration tool

## If Migration Fails
If you get an error about the migration already being applied but the column is still missing:

```bash
# Force re-apply with fake-initial
python manage.py migrate inventory 0016 --fake-initial

# Or manually add the column
python manage.py dbshell
```

Then run:
```sql
ALTER TABLE inventory_service 
ADD COLUMN IF NOT EXISTS customer_id UUID,
ADD COLUMN IF NOT EXISTS next_invoice_date DATE,
ADD COLUMN IF NOT EXISTS last_invoice_date DATE;

ALTER TABLE inventory_service
ADD CONSTRAINT inventory_service_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES crm_customer(id) 
ON DELETE SET NULL;
```

## Notes
- This is a safe migration (only adds columns, no data loss)
- The columns are nullable so existing records won't be affected
- Once fixed on staging, same process applies to production