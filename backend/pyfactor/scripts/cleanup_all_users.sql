-- Comprehensive User Data Cleanup Script
-- This script removes all users and their associated data in the correct order
-- respecting foreign key constraints

-- First, show what we're about to delete
SELECT 'Data counts before deletion:' as info;
SELECT 
    'user_sessions' as table_name, COUNT(*) as count FROM user_sessions
UNION ALL SELECT 
    'session_manager_session', COUNT(*) FROM session_manager_session
UNION ALL SELECT 
    'payments_payment', COUNT(*) FROM payments_payment
UNION ALL SELECT 
    'payments_subscription', COUNT(*) FROM payments_subscription
UNION ALL SELECT 
    'onboarding_onboardingprogress', COUNT(*) FROM onboarding_onboardingprogress
UNION ALL SELECT 
    'custom_auth_user', COUNT(*) FROM custom_auth_user
UNION ALL SELECT 
    'custom_auth_tenant', COUNT(*) FROM custom_auth_tenant
ORDER BY table_name;

-- Start transaction for safety
BEGIN;

-- 1. Delete session-related data first
DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM custom_auth_user);
DELETE FROM session_manager_session WHERE user_id IN (SELECT id FROM custom_auth_user);

-- 2. Delete payment-related data
DELETE FROM payments_payment WHERE user_id IN (SELECT id FROM custom_auth_user);
DELETE FROM payments_subscription WHERE user_id IN (SELECT id FROM custom_auth_user);

-- 3. Delete onboarding progress
DELETE FROM onboarding_onboardingprogress WHERE user_id IN (SELECT id FROM custom_auth_user);

-- 4. Delete any other tables that might reference users or tenants
-- (Add more tables here if you have them)

-- 5. Delete users (this will also delete related data due to CASCADE if set)
DELETE FROM custom_auth_user;

-- 6. Finally, delete tenants (after users are gone)
DELETE FROM custom_auth_tenant;

-- Show final counts
SELECT 'Data counts after deletion:' as info;
SELECT 
    'user_sessions' as table_name, COUNT(*) as count FROM user_sessions
UNION ALL SELECT 
    'session_manager_session', COUNT(*) FROM session_manager_session
UNION ALL SELECT 
    'payments_payment', COUNT(*) FROM payments_payment
UNION ALL SELECT 
    'payments_subscription', COUNT(*) FROM payments_subscription
UNION ALL SELECT 
    'onboarding_onboardingprogress', COUNT(*) FROM onboarding_onboardingprogress
UNION ALL SELECT 
    'custom_auth_user', COUNT(*) FROM custom_auth_user
UNION ALL SELECT 
    'custom_auth_tenant', COUNT(*) FROM custom_auth_tenant
ORDER BY table_name;

-- IMPORTANT: Review the results before committing!
-- If everything looks good, run: COMMIT;
-- If something went wrong, run: ROLLBACK;

-- To commit the changes, uncomment the next line:
-- COMMIT;

-- To see what foreign keys exist (for debugging):
/*
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (ccu.table_name = 'custom_auth_user' OR ccu.table_name = 'custom_auth_tenant')
ORDER BY tc.table_name;
*/