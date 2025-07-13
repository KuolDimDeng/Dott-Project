# Stripe SSN Migration - Step-by-Step Guide

## Prerequisites
- Ensure your Stripe API keys are configured in production
- Have SSH access to your production server
- Database backup recommended before migration

## Step 1: Add Database Columns

### Option A: On Render.com (Production)
```bash
# SSH into your Render shell
# From Render dashboard: Services > dott-api > Shell

# Navigate to app directory
cd /app

# Run the column addition script
python scripts/add_stripe_ssn_fields_prod.py
```

### Option B: Local Testing First (Recommended)
```bash
# Start your local Docker environment
cd /Users/kuoldeng/projectx
docker-compose up -d db redis backend

# Wait for services to start (about 30 seconds)
sleep 30

# Run migration inside Docker container
docker-compose exec backend python scripts/add_stripe_ssn_fields.py

# Check the output - should see:
# ✅ stripe_person_id column added
# ✅ stripe_account_id column added
# ✅ ssn_stored_in_stripe column added
```

## Step 2: Migrate Existing SSNs to Stripe

### Option A: On Render.com (Production)
```bash
# In the Render shell (same session or new)
cd /app

# Set environment variables if not already set
export DATABASE_URL="your-database-url"
export STRIPE_SECRET_KEY="sk_live_..."

# Run the migration script
python scripts/migrate_existing_ssns_to_stripe_prod.py

# You'll see progress like:
# 🔍 Found 150 employees to process
# 🔄 Migrating john.doe@example.com...
# ✅ john.doe@example.com - Migrated successfully
# ...
# 📊 MIGRATION SUMMARY
# Total employees: 150
# ✅ Successfully migrated: 120
# ⏭️  Already in Stripe: 0
# ⏭️  No SSN to migrate: 30
# ❌ Failed: 0
```

### Option B: Local Testing
```bash
# In your local Docker environment
docker-compose exec backend python scripts/migrate_existing_ssns_to_stripe.py
```

## Step 3: Verify Migration

### Check Database
```bash
# In Render shell or local Docker
python manage.py shell

# Run these commands in the Python shell:
from hr.models import Employee

# Check migration status
total = Employee.objects.count()
migrated = Employee.objects.filter(ssn_stored_in_stripe=True).count()
print(f"Total employees: {total}")
print(f"Migrated to Stripe: {migrated}")

# Check specific employee
emp = Employee.objects.filter(email='test@example.com').first()
if emp:
    print(f"SSN in Stripe: {emp.ssn_stored_in_stripe}")
    print(f"Last 4 digits: {emp.ssn_last_four}")
    print(f"Stripe Account: {emp.stripe_account_id}")
```

### Check Stripe Dashboard
1. Log into Stripe Dashboard
2. Go to Connect > Accounts
3. Search for employee emails
4. Verify accounts were created with metadata

## Troubleshooting

### Common Issues and Solutions

#### 1. "STRIPE_SECRET_KEY not configured"
```bash
# Set the environment variable
export STRIPE_SECRET_KEY="sk_live_your_key_here"
```

#### 2. "No SSN columns found"
This means your database might be using different column names. Check with:
```bash
python manage.py shell
# Then run:
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'hr_employee' 
        AND column_name LIKE '%ssn%' OR column_name LIKE '%security%'
    """)
    print([row[0] for row in cursor.fetchall()])
```

#### 3. "Failed to create Stripe account"
- Verify your Stripe API key has Connect permissions
- Check if the employee has required fields (email, name)
- Review Stripe Dashboard for API error logs

#### 4. Migration Interrupted
If migration stops midway:
```bash
# Re-run the script - it will skip already migrated employees
python scripts/migrate_existing_ssns_to_stripe_prod.py
```

## Post-Migration

### 1. Test New Employee Creation
Create a test employee with SSN to ensure the new flow works:
```bash
# In Django shell
from hr.models import Employee
emp = Employee.objects.create(
    first_name="Test",
    last_name="User",
    email="test@example.com",
    business_id="your-business-id"
)
success, msg = emp.save_ssn_to_stripe("123-45-6789")
print(f"Success: {success}, Message: {msg}")
```

### 2. Clean Up (Optional)
After confirming migration success, you can remove old SSN columns:
```sql
-- Only run after verifying all data is in Stripe!
ALTER TABLE hr_employee DROP COLUMN IF EXISTS ssn;
ALTER TABLE hr_employee DROP COLUMN IF EXISTS ssn_encrypted;
ALTER TABLE hr_employee DROP COLUMN IF EXISTS security_number;
```

## Rollback Plan

If you need to rollback:
1. SSNs remain in Stripe (cannot be retrieved in full)
2. Last 4 digits are preserved in database
3. Old SSN fields were cleared but can be restored from backup
4. Stripe accounts can be deleted if needed

## Security Notes

- Migration logs don't contain full SSNs
- Stripe API calls use HTTPS
- Local SSN fields are cleared immediately after successful migration
- Consider running migration during off-hours to minimize exposure

## Need Help?

Check logs for detailed error messages:
- Render: Check service logs in dashboard
- Local: `docker-compose logs backend`
- Stripe: Check API logs in Stripe Dashboard