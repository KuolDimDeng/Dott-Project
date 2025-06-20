# Clean Database Commands for Render Shell

## Connect to Render Shell
1. Go to your Render dashboard
2. Click on your backend service (dott-api)
3. Go to "Shell" tab
4. Run: `python manage.py dbshell`

## Step-by-Step Commands to Clean Database

### 1. First, check what data you have:
```sql
-- Check current data
SELECT COUNT(*) as users FROM accounts_customuser;
SELECT COUNT(*) as tenants FROM accounts_tenant;
SELECT COUNT(*) as sessions FROM django_session;
```

### 2. Delete all tenant schemas:
```sql
-- Delete all tenant schemas
DO $$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE 'DROP SCHEMA IF EXISTS ' || quote_ident(schema_record.schema_name) || ' CASCADE';
        RAISE NOTICE 'Dropped: %', schema_record.schema_name;
    END LOOP;
END $$;
```

### 3. Clean all user-related tables:
```sql
-- Delete all user data (in order to avoid foreign key issues)
DELETE FROM accounts_stripesubscription;
DELETE FROM accounts_paymentintent;
DELETE FROM accounts_stripecustomer;
DELETE FROM accounts_tenantusermembership;
DELETE FROM accounts_tenant;
DELETE FROM django_session;
DELETE FROM accounts_usersession;
DELETE FROM accounts_useractivity;
DELETE FROM accounts_userloginhistory;
DELETE FROM accounts_auth0user;
DELETE FROM accounts_onboardingprogress;
DELETE FROM accounts_customuser;
```

### 4. Verify everything is cleaned:
```sql
-- Verify cleanup
SELECT 'Users' as table_name, COUNT(*) as count FROM accounts_customuser
UNION ALL
SELECT 'Tenants', COUNT(*) FROM accounts_tenant
UNION ALL
SELECT 'Sessions', COUNT(*) FROM django_session;
```

### 5. Exit dbshell:
```sql
\q
```

## Alternative: One-Command Cleanup

If you want to do everything in one command, paste this entire block:

```sql
BEGIN;
-- Drop all tenant schemas
DO $$
DECLARE
    s TEXT;
BEGIN
    FOR s IN SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE 'DROP SCHEMA ' || quote_ident(s) || ' CASCADE';
    END LOOP;
END $$;
-- Truncate all tables
TRUNCATE accounts_stripesubscription, accounts_paymentintent, accounts_stripecustomer, accounts_tenantusermembership, accounts_tenant, django_session, accounts_usersession, accounts_useractivity, accounts_userloginhistory, accounts_auth0user, accounts_onboardingprogress, accounts_customuser CASCADE;
COMMIT;
-- Show results
SELECT 'Cleanup complete. Remaining users:' as status, COUNT(*) as count FROM accounts_customuser;
```

## Safety Notes

⚠️ **WARNING**: This will delete ALL user data!
- Only use in development/testing environments
- Cannot be undone
- Will delete all tenants, users, and their data

## Testing After Cleanup

After running these commands:
1. Exit the shell: `\q`
2. You can now test fresh onboarding
3. All users will need to sign up again
4. All tenant data will be gone