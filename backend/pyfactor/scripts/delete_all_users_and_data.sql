-- Delete All Users and Associated Data from Render Backend Database
-- This script deletes all user data in the correct order to avoid foreign key constraint violations
-- Author: Claude
-- Date: 2025-01-13

-- Enable verbose output
\timing on
\echo 'Starting complete user data deletion...'
\echo '================================================'

-- Step 1: Show existing users before deletion
\echo ''
\echo 'Step 1: Current users in the system:'
\echo '------------------------------------'
SELECT COUNT(*) as total_users, 
       COUNT(CASE WHEN is_deleted = true THEN 1 END) as soft_deleted_users,
       COUNT(CASE WHEN is_deleted = false OR is_deleted IS NULL THEN 1 END) as active_users
FROM custom_auth_user;

\echo ''
\echo 'User details:'
SELECT id, email, tenant_id, is_deleted, date_joined 
FROM custom_auth_user 
ORDER BY date_joined DESC 
LIMIT 20;

-- Step 2: Show existing tenants
\echo ''
\echo 'Step 2: Current tenants in the system:'
\echo '--------------------------------------'
SELECT COUNT(*) as total_tenants,
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_tenants
FROM custom_auth_tenant;

\echo ''
\echo 'Tenant details:'
SELECT id, name, owner_id, is_active, created_at 
FROM custom_auth_tenant 
ORDER BY created_at DESC 
LIMIT 20;

-- Step 3: Begin transaction for safe deletion
\echo ''
\echo 'Step 3: Beginning transaction for data deletion...'
\echo '===================================================='
BEGIN;

-- Disable foreign key checks temporarily (if needed)
-- Note: PostgreSQL doesn't have a global way to disable FK checks, so we'll delete in correct order

-- Step 4: Delete from the most dependent tables first (leaf nodes in the dependency tree)

-- Delete from finance app tables
\echo ''
\echo 'Deleting finance-related data...'
DELETE FROM finance_transaction;
DELETE FROM finance_journalentry;
DELETE FROM finance_account;

-- Delete from reports
\echo 'Deleting reports...'
DELETE FROM reports_report;

-- Delete from HR/Payroll related tables (if they exist)
\echo 'Deleting HR/Payroll data...'
-- These might not exist, so we'll use conditional deletion
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hr_employee') THEN
        EXECUTE 'DELETE FROM hr_employee';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_payroll') THEN
        EXECUTE 'DELETE FROM payroll_payroll';
    END IF;
END $$;

-- Delete from inventory tables
\echo 'Deleting inventory data...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_item') THEN
        EXECUTE 'DELETE FROM inventory_item';
    END IF;
END $$;

-- Delete from sales/purchases tables
\echo 'Deleting sales/purchases data...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_invoice') THEN
        EXECUTE 'DELETE FROM sales_invoice';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchases_bill') THEN
        EXECUTE 'DELETE FROM purchases_bill';
    END IF;
END $$;

-- Delete from banking tables
\echo 'Deleting banking data...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banking_banktransaction') THEN
        EXECUTE 'DELETE FROM banking_banktransaction';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banking_bankaccount') THEN
        EXECUTE 'DELETE FROM banking_bankaccount';
    END IF;
END $$;

-- Delete from CRM tables
\echo 'Deleting CRM data...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_customer') THEN
        EXECUTE 'DELETE FROM crm_customer';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_vendor') THEN
        EXECUTE 'DELETE FROM crm_vendor';
    END IF;
END $$;

-- Step 5: Delete from user-related tables

-- Delete user menu privileges
\echo ''
\echo 'Deleting user menu privileges...'
DELETE FROM users_menu_privilege;

-- Delete business members
\echo 'Deleting business members...'
DELETE FROM users_businessmember;

-- Delete subscriptions
\echo 'Deleting subscriptions...'
DELETE FROM users_subscription;

-- Delete business details
\echo 'Deleting business details...'
DELETE FROM users_business_details;

-- Delete onboarding progress
\echo 'Deleting onboarding progress...'
DELETE FROM onboarding_onboardingprogress;

-- Delete user profiles (both tables if they exist)
\echo 'Deleting user profiles...'
DELETE FROM users_userprofile;
DELETE FROM onboarding_userprofile;

-- Delete businesses
\echo 'Deleting businesses...'
DELETE FROM users_business;

-- Delete account deletion logs (audit trail)
\echo 'Deleting account deletion logs...'
DELETE FROM custom_auth_account_deletion_log;

-- Step 6: Delete core authentication data

-- Delete users
\echo ''
\echo 'Deleting all users...'
DELETE FROM custom_auth_user;

-- Delete tenants
\echo 'Deleting all tenants...'
DELETE FROM custom_auth_tenant;

-- Step 7: Reset sequences (optional)
\echo ''
\echo 'Resetting sequences...'
-- Reset user ID sequence
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'custom_auth_user_id_seq') THEN
        EXECUTE 'ALTER SEQUENCE custom_auth_user_id_seq RESTART WITH 1';
    END IF;
END $$;

-- Step 8: Verify deletion
\echo ''
\echo 'Step 8: Verifying deletion...'
\echo '=============================='

-- Check users
\echo ''
\echo 'Remaining users:'
SELECT COUNT(*) as remaining_users FROM custom_auth_user;

-- Check tenants
\echo ''
\echo 'Remaining tenants:'
SELECT COUNT(*) as remaining_tenants FROM custom_auth_tenant;

-- Check businesses
\echo ''
\echo 'Remaining businesses:'
SELECT COUNT(*) as remaining_businesses FROM users_business;

-- Check user profiles
\echo ''
\echo 'Remaining user profiles:'
SELECT COUNT(*) as remaining_profiles FROM users_userprofile;

-- Check onboarding progress
\echo ''
\echo 'Remaining onboarding records:'
SELECT COUNT(*) as remaining_onboarding FROM onboarding_onboardingprogress;

-- Step 9: Commit or Rollback
\echo ''
\echo 'Step 9: Transaction Status'
\echo '=========================='
\echo 'To COMMIT these changes, type: COMMIT;'
\echo 'To ROLLBACK these changes, type: ROLLBACK;'
\echo ''
\echo 'Current transaction state: PENDING'

-- Uncomment the following line to auto-commit (BE CAREFUL!)
-- COMMIT;

-- End of script
\echo ''
\echo 'Script execution completed. Transaction is still open.'
\echo 'You must manually COMMIT or ROLLBACK the changes.'
\echo '======================================================'