-- Quick cleanup script - Run this directly in psql

-- Show what we're about to delete
\echo 'Current data counts:'
SELECT 'user_sessions' as table, COUNT(*) FROM user_sessions
UNION ALL SELECT 'custom_auth_user', COUNT(*) FROM custom_auth_user
UNION ALL SELECT 'custom_auth_tenant', COUNT(*) FROM custom_auth_tenant;

-- Delete in correct order
\echo '\nDeleting data...'

-- 1. Delete sessions first (they reference users)
DELETE FROM user_sessions;
\echo 'Deleted user_sessions'

-- 2. Delete session_manager sessions if table exists
DELETE FROM session_manager_session WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_manager_session');
\echo 'Deleted session_manager_session (if exists)'

-- 3. Delete other related data
DELETE FROM onboarding_onboardingprogress;
\echo 'Deleted onboarding_onboardingprogress'

-- 4. Delete payments if tables exist
DELETE FROM payments_payment WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments_payment');
DELETE FROM payments_subscription WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments_subscription');
\echo 'Deleted payment data (if exists)'

-- 5. Now we can delete users
DELETE FROM custom_auth_user;
\echo 'Deleted users'

-- 6. Finally delete tenants
DELETE FROM custom_auth_tenant;
\echo 'Deleted tenants'

-- Show final counts
\echo '\nFinal data counts:'
SELECT 'user_sessions' as table, COUNT(*) FROM user_sessions
UNION ALL SELECT 'custom_auth_user', COUNT(*) FROM custom_auth_user
UNION ALL SELECT 'custom_auth_tenant', COUNT(*) FROM custom_auth_tenant;

\echo '\n✅ Cleanup complete!'