-- Complete User Data Purge Script
-- WARNING: This will delete ALL user data from the database
-- Run with caution!

BEGIN;

-- Show current counts
SELECT 'Current User Count' as description, COUNT(*) as count FROM auth_user
UNION ALL
SELECT 'Current Tenant Count', COUNT(*) FROM custom_auth_tenant
UNION ALL
SELECT 'Current Onboarding Progress Count', COUNT(*) FROM custom_auth_onboardingprogress;

-- Delete all onboarding progress records
DELETE FROM custom_auth_onboardingprogress;

-- Delete all tenant records
DELETE FROM custom_auth_tenant;

-- Delete all user records
DELETE FROM auth_user;

-- Show counts after deletion
SELECT 'Users After Deletion' as description, COUNT(*) as count FROM auth_user
UNION ALL
SELECT 'Tenants After Deletion', COUNT(*) FROM custom_auth_tenant
UNION ALL
SELECT 'Onboarding Progress After Deletion', COUNT(*) FROM custom_auth_onboardingprogress;

-- Reset sequences (PostgreSQL specific)
-- Uncomment if using PostgreSQL
-- ALTER SEQUENCE auth_user_id_seq RESTART WITH 1;

COMMIT;

-- Verify the purge
SELECT 'Final User Count' as description, COUNT(*) as count FROM auth_user
UNION ALL
SELECT 'Final Tenant Count', COUNT(*) FROM custom_auth_tenant
UNION ALL
SELECT 'Final Onboarding Progress Count', COUNT(*) FROM custom_auth_onboardingprogress;