-- =====================================================
-- CLEAN DATABASE FOR FRESH TESTING - RENDER PRODUCTION
-- =====================================================
-- Run in Render shell: python manage.py dbshell
-- Then paste this script
-- =====================================================

-- First, check current data
SELECT 'Current users:' as info, COUNT(*) as count FROM custom_auth_user
UNION ALL
SELECT 'Current tenants:', COUNT(*) FROM custom_auth_tenant
UNION ALL
SELECT 'Current tenant schemas:', COUNT(*) FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';

-- Main cleanup script
BEGIN; 

-- 1. Drop all tenant schemas
DO $$ 
DECLARE 
    s TEXT; 
BEGIN 
    FOR s IN SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' 
    LOOP 
        EXECUTE 'DROP SCHEMA ' || quote_ident(s) || ' CASCADE'; 
        RAISE NOTICE 'Dropped schema: %', s;
    END LOOP; 
END $$; 

-- 2. Clean user-related tables (in dependency order)
-- Payment related
DELETE FROM payments_paymenttransaction;
DELETE FROM payments_webhookevent;

-- Business/subscription related  
DELETE FROM users_businessmember;
DELETE FROM users_subscription;
DELETE FROM users_business_details;
DELETE FROM users_business;

-- User profiles and onboarding
DELETE FROM onboarding_onboardingprogress;
DELETE FROM onboarding_userprofile;
DELETE FROM users_userprofile;

-- Sessions and security
DELETE FROM user_sessions;
DELETE FROM session_events;
DELETE FROM session_security;
DELETE FROM device_fingerprints;
DELETE FROM device_trust;

-- Auth0/User deletion logs
DELETE FROM custom_auth_account_deletion_log;
DELETE FROM custom_auth_accountdeletionlog;
DELETE FROM user_deletion_tracking;

-- Finally, tenants and users
DELETE FROM custom_auth_tenant;
DELETE FROM custom_auth_user;

COMMIT;

-- Verify cleanup
SELECT 'After cleanup - Users:' as info, COUNT(*) as count FROM custom_auth_user
UNION ALL
SELECT 'After cleanup - Tenants:', COUNT(*) FROM custom_auth_tenant
UNION ALL
SELECT 'After cleanup - Tenant schemas:', COUNT(*) FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';