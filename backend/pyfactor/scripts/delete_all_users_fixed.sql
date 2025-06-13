-- Delete All Users and Associated Data from Render Backend Database
-- Fixed version with correct table names
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
ORDER BY date_joined DESC;

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
ORDER BY created_at DESC;

-- Step 3: Begin transaction for safe deletion
\echo ''
\echo 'Step 3: Beginning transaction for data deletion...'
\echo '===================================================='
BEGIN;

-- Step 4: Delete from the most dependent tables first
-- Using the correct table names from your \dt output

-- Delete from finance app tables
\echo ''
\echo 'Deleting finance-related data...'
DO $$ 
BEGIN
    -- Finance transaction tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'finance_financetransaction') THEN
        EXECUTE 'DELETE FROM finance_financetransaction';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'finance_journalentryline') THEN
        EXECUTE 'DELETE FROM finance_journalentryline';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'finance_journalentry') THEN
        EXECUTE 'DELETE FROM finance_journalentry';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'finance_generalledgerentry') THEN
        EXECUTE 'DELETE FROM finance_generalledgerentry';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'finance_budgetitem') THEN
        EXECUTE 'DELETE FROM finance_budgetitem';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'finance_budget') THEN
        EXECUTE 'DELETE FROM finance_budget';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'finance_account') THEN
        EXECUTE 'DELETE FROM finance_account';
    END IF;
END $$;

-- Delete from sales/invoice tables
\echo 'Deleting sales data...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_invoiceitem') THEN
        EXECUTE 'DELETE FROM sales_invoiceitem';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_invoice') THEN
        EXECUTE 'DELETE FROM sales_invoice';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_estimateitem') THEN
        EXECUTE 'DELETE FROM sales_estimateitem';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_estimate') THEN
        EXECUTE 'DELETE FROM sales_estimate';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_salesorderitem') THEN
        EXECUTE 'DELETE FROM sales_salesorderitem';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_salesorder') THEN
        EXECUTE 'DELETE FROM sales_salesorder';
    END IF;
END $$;

-- Delete from HR/Payroll tables
\echo 'Deleting HR/Payroll data...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_payrolltransaction') THEN
        EXECUTE 'DELETE FROM payroll_payrolltransaction';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_payrollrun') THEN
        EXECUTE 'DELETE FROM payroll_payrollrun';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hr_timesheetentry') THEN
        EXECUTE 'DELETE FROM hr_timesheetentry';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hr_timesheet') THEN
        EXECUTE 'DELETE FROM hr_timesheet';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hr_employee') THEN
        EXECUTE 'DELETE FROM hr_employee';
    END IF;
END $$;

-- Delete from inventory tables
\echo 'Deleting inventory data...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_inventorytransaction') THEN
        EXECUTE 'DELETE FROM inventory_inventorytransaction';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_inventoryitem') THEN
        EXECUTE 'DELETE FROM inventory_inventoryitem';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_product') THEN
        EXECUTE 'DELETE FROM inventory_product';
    END IF;
END $$;

-- Delete from purchases tables
\echo 'Deleting purchases data...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchases_billitem') THEN
        EXECUTE 'DELETE FROM purchases_billitem';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchases_bill') THEN
        EXECUTE 'DELETE FROM purchases_bill';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchases_purchaseorderitem') THEN
        EXECUTE 'DELETE FROM purchases_purchaseorderitem';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchases_purchaseorder') THEN
        EXECUTE 'DELETE FROM purchases_purchaseorder';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchases_vendor') THEN
        EXECUTE 'DELETE FROM purchases_vendor';
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
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_activity') THEN
        EXECUTE 'DELETE FROM crm_activity';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_opportunity') THEN
        EXECUTE 'DELETE FROM crm_opportunity';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_customer') THEN
        EXECUTE 'DELETE FROM crm_customer';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_contact') THEN
        EXECUTE 'DELETE FROM crm_contact';
    END IF;
END $$;

-- Delete from payments tables
\echo 'Deleting payments data...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments_paymenttransaction') THEN
        EXECUTE 'DELETE FROM payments_paymenttransaction';
    END IF;
END $$;

-- Delete from reports
\echo 'Deleting reports...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports_report') THEN
        EXECUTE 'DELETE FROM reports_report';
    END IF;
END $$;

-- Delete from integrations
\echo 'Deleting integrations data...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations_woocommerceorder') THEN
        EXECUTE 'DELETE FROM integrations_woocommerceorder';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations_integration') THEN
        EXECUTE 'DELETE FROM integrations_integration';
    END IF;
END $$;

-- Step 5: Delete from user-related tables

-- Delete user menu privileges
\echo ''
\echo 'Deleting user menu privileges...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_usermenuprivilege') THEN
        EXECUTE 'DELETE FROM users_usermenuprivilege';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_menu_privilege') THEN
        EXECUTE 'DELETE FROM users_menu_privilege';
    END IF;
END $$;

-- Delete business members
\echo 'Deleting business members...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_businessmember') THEN
        EXECUTE 'DELETE FROM users_businessmember';
    END IF;
END $$;

-- Delete subscriptions
\echo 'Deleting subscriptions...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_subscription') THEN
        EXECUTE 'DELETE FROM users_subscription';
    END IF;
END $$;

-- Delete business details
\echo 'Deleting business details...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_business_details') THEN
        EXECUTE 'DELETE FROM users_business_details';
    END IF;
END $$;

-- Delete onboarding progress
\echo 'Deleting onboarding progress...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_onboardingprogress') THEN
        EXECUTE 'DELETE FROM onboarding_onboardingprogress';
    END IF;
END $$;

-- Delete user profiles
\echo 'Deleting user profiles...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_userprofile') THEN
        EXECUTE 'DELETE FROM users_userprofile';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_userprofile') THEN
        EXECUTE 'DELETE FROM onboarding_userprofile';
    END IF;
END $$;

-- Delete businesses
\echo 'Deleting businesses...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_business') THEN
        EXECUTE 'DELETE FROM users_business';
    END IF;
END $$;

-- Delete account deletion logs
\echo 'Deleting account deletion logs...'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_auth_accountdeletionlog') THEN
        EXECUTE 'DELETE FROM custom_auth_accountdeletionlog';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_auth_account_deletion_log') THEN
        EXECUTE 'DELETE FROM custom_auth_account_deletion_log';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_deletion_tracking') THEN
        EXECUTE 'DELETE FROM user_deletion_tracking';
    END IF;
END $$;

-- Step 6: Delete core authentication data

-- Delete users
\echo ''
\echo 'Deleting all users...'
DELETE FROM custom_auth_user;

-- Delete tenants
\echo 'Deleting all tenants...'
DELETE FROM custom_auth_tenant;

-- Step 7: Reset sequences
\echo ''
\echo 'Resetting sequences...'
DO $$ 
BEGIN
    -- Reset user ID sequence
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'custom_auth_user_id_seq') THEN
        EXECUTE 'ALTER SEQUENCE custom_auth_user_id_seq RESTART WITH 1';
    END IF;
    -- Reset tenant sequence
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'custom_auth_tenant_id_seq') THEN
        -- Tenant uses UUID, no sequence to reset
        NULL;
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
SELECT COUNT(*) as remaining_businesses FROM users_business WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_business');

-- Check user profiles
\echo ''
\echo 'Remaining user profiles:'
SELECT COUNT(*) as remaining_profiles FROM users_userprofile WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_userprofile');

-- Check onboarding progress
\echo ''
\echo 'Remaining onboarding records:'
SELECT COUNT(*) as remaining_onboarding FROM onboarding_onboardingprogress WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_onboardingprogress');

-- Step 9: Commit or Rollback
\echo ''
\echo 'Step 9: Transaction Status'
\echo '=========================='
\echo 'To COMMIT these changes, type: COMMIT;'
\echo 'To ROLLBACK these changes, type: ROLLBACK;'
\echo ''
\echo 'Current transaction state: PENDING'

-- End of script
\echo ''
\echo 'Script execution completed. Transaction is still open.'
\echo 'You must manually COMMIT or ROLLBACK the changes.'
\echo '======================================================'