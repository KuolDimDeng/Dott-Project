-- Simple Delete All Users Script
-- This version auto-commits the changes - USE WITH EXTREME CAUTION!
-- 
-- Usage: psql -U <username> -d <database> -f delete_all_users_simple.sql
--    OR: python manage.py dbshell < scripts/delete_all_users_simple.sql

\echo 'STARTING COMPLETE USER DATA DELETION...'
\echo '======================================'
\echo ''

-- Show counts before deletion
\echo 'Current user count:'
SELECT COUNT(*) as users FROM custom_auth_user;
\echo ''
\echo 'Current tenant count:'
SELECT COUNT(*) as tenants FROM custom_auth_tenant;
\echo ''

-- Start deletion (order matters for foreign key constraints)
\echo 'Deleting all data...'

-- Finance/Reports
DELETE FROM finance_financetransaction WHERE tenant_id IS NOT NULL OR tenant_id IS NULL;
DELETE FROM finance_journalentry WHERE tenant_id IS NOT NULL OR tenant_id IS NULL;
DELETE FROM finance_journalentryline WHERE tenant_id IS NOT NULL OR tenant_id IS NULL;
DELETE FROM finance_account WHERE tenant_id IS NOT NULL OR tenant_id IS NULL;
DELETE FROM reports_report WHERE tenant_id IS NOT NULL OR tenant_id IS NULL;

-- User-related tables
DELETE FROM users_menu_privilege;
DELETE FROM users_businessmember;
DELETE FROM users_subscription;
DELETE FROM users_business_details;
DELETE FROM onboarding_onboardingprogress;
DELETE FROM users_userprofile;
DELETE FROM users_business;

-- Audit logs
DELETE FROM custom_auth_account_deletion_log;

-- Core tables
DELETE FROM custom_auth_user;
DELETE FROM custom_auth_tenant;

-- Verify deletion
\echo ''
\echo 'Verification - Remaining counts:'
\echo '================================'
SELECT 'Users' as table_name, COUNT(*) as count FROM custom_auth_user
UNION ALL
SELECT 'Tenants', COUNT(*) FROM custom_auth_tenant
UNION ALL
SELECT 'Businesses', COUNT(*) FROM users_business
UNION ALL
SELECT 'User Profiles', COUNT(*) FROM users_userprofile
UNION ALL
SELECT 'Onboarding', COUNT(*) FROM onboarding_onboardingprogress;

\echo ''
\echo '✅ DELETION COMPLETE!'
\echo ''