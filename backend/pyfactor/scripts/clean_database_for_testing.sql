-- =====================================================
-- CLEAN DATABASE FOR FRESH TESTING
-- Run this in Render shell: python manage.py dbshell
-- Then paste this SQL script
-- =====================================================

-- First, let's see what we have
SELECT 'Current user count:' as info, COUNT(*) as count FROM accounts_customuser
UNION ALL
SELECT 'Current tenant count:', COUNT(*) FROM accounts_tenant
UNION ALL
SELECT 'Current tenant schemas:', COUNT(*) FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';

-- Start cleaning (uncomment the lines below to execute)
-- BEGIN;

-- Delete all tenant schemas
DO $$
DECLARE
    tenant_schema TEXT;
BEGIN
    FOR tenant_schema IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE format('DROP SCHEMA %I CASCADE', tenant_schema);
        RAISE NOTICE 'Dropped schema: %', tenant_schema;
    END LOOP;
END $$;

-- Clean public schema tables
TRUNCATE TABLE 
    accounts_stripesubscription,
    accounts_paymentintent,
    accounts_stripecustomer,
    accounts_tenantusermembership,
    accounts_tenant,
    django_session,
    accounts_usersession,
    accounts_useractivity,
    accounts_userloginhistory,
    accounts_auth0user,
    accounts_onboardingprogress,
    accounts_customuser
CASCADE;

-- COMMIT;

-- Verify cleanup
SELECT 'After cleanup - Users:' as info, COUNT(*) as count FROM accounts_customuser
UNION ALL
SELECT 'After cleanup - Tenants:', COUNT(*) FROM accounts_tenant
UNION ALL
SELECT 'After cleanup - Schemas:', COUNT(*) FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';