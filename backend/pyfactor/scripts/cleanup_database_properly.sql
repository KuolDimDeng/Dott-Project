-- Cleanup database with proper foreign key handling
-- This script handles foreign key constraints properly

BEGIN;

-- First show what we're dealing with
SELECT 'Current state:' as info;
SELECT 'Users' as table_name, COUNT(*) as count FROM custom_auth_user
UNION ALL
SELECT 'Sessions' as table_name, COUNT(*) as count FROM user_sessions
UNION ALL
SELECT 'Session Security' as table_name, COUNT(*) as count FROM session_security
UNION ALL
SELECT 'Session Events' as table_name, COUNT(*) as count FROM session_events
UNION ALL
SELECT 'Onboarding Progress' as table_name, COUNT(*) as count FROM onboarding_onboardingprogress;

-- Clean up in the correct order to respect foreign keys
DO $$
DECLARE
    s TEXT;
BEGIN
    -- 1. Drop all tenant schemas first
    FOR s IN SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE 'DROP SCHEMA ' || quote_ident(s) || ' CASCADE';
        RAISE NOTICE 'Dropped schema: %', s;
    END LOOP;
END $$;

-- 2. Delete in order of dependencies (most dependent first)

-- Session security depends on sessions
DELETE FROM session_security;

-- Session events
DELETE FROM session_events;

-- Now we can delete sessions
DELETE FROM user_sessions;

-- Delete other dependent data
DELETE FROM onboarding_onboardingprogress;
DELETE FROM users_userprofile;
DELETE FROM users_invitation;
DELETE FROM users_tenant;

-- Delete payment related if exists
DELETE FROM payment_paymentmethod WHERE true;
DELETE FROM payment_invoice WHERE true;
DELETE FROM payment_subscription WHERE true;

-- Delete inventory related if exists
DELETE FROM inventory_product WHERE true;
DELETE FROM inventory_category WHERE true;

-- Finally delete users (except the superuser)
DELETE FROM custom_auth_user WHERE email != 'kdeng@dottapps.com';

-- Show final state
SELECT 'Final state:' as info;
SELECT 'Users' as table_name, COUNT(*) as count FROM custom_auth_user
UNION ALL
SELECT 'Sessions' as table_name, COUNT(*) as count FROM user_sessions
UNION ALL
SELECT 'Tenants' as table_name, COUNT(*) as count FROM users_tenant
UNION ALL
SELECT 'Onboarding Progress' as table_name, COUNT(*) as count FROM onboarding_onboardingprogress;

COMMIT;

-- Verify cleanup
SELECT 'Remaining users:' as info;
SELECT id, email, date_joined FROM custom_auth_user;

-- Check for any remaining tenant schemas
SELECT 'Remaining tenant schemas:' as info;
SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';