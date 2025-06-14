-- Comprehensive script to delete ALL user data from the database
-- This handles all foreign key constraints in the correct order

BEGIN;

-- Disable RLS temporarily (if using superuser)
ALTER TABLE IF EXISTS custom_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS onboarding_progress DISABLE ROW LEVEL SECURITY;

-- 1. Delete all dependent data first (in order of dependencies)

-- Delete payroll-related data
DELETE FROM payroll_payslip WHERE created_by_id IN (SELECT id FROM custom_user);
DELETE FROM payroll_taxcalculation WHERE created_by_id IN (SELECT id FROM custom_user);
DELETE FROM payroll_payrollrecord WHERE employee_id IN (SELECT id FROM hr_employee);
DELETE FROM payroll_payrollperiod WHERE created_by_id IN (SELECT id FROM custom_user);

-- Delete HR-related data
DELETE FROM hr_employeedocument WHERE employee_id IN (SELECT id FROM hr_employee);
DELETE FROM hr_employeebenefit WHERE employee_id IN (SELECT id FROM hr_employee);
DELETE FROM hr_attendance WHERE employee_id IN (SELECT id FROM hr_employee);
DELETE FROM hr_leave WHERE employee_id IN (SELECT id FROM hr_employee);
DELETE FROM hr_employee;
DELETE FROM hr_department;

-- Delete inventory-related data
DELETE FROM inventory_stockmovement WHERE created_by_id IN (SELECT id FROM custom_user);
DELETE FROM inventory_inventoryitem WHERE created_by_id IN (SELECT id FROM custom_user);
DELETE FROM inventory_category WHERE created_by_id IN (SELECT id FROM custom_user);
DELETE FROM inventory_supplier WHERE created_by_id IN (SELECT id FROM custom_user);

-- Delete accounting-related data
DELETE FROM accounting_journalentry WHERE created_by_id IN (SELECT id FROM custom_user);
DELETE FROM accounting_transaction WHERE created_by_id IN (SELECT id FROM custom_user);
DELETE FROM accounting_invoice WHERE created_by_id IN (SELECT id FROM custom_user);
DELETE FROM accounting_account WHERE created_by_id IN (SELECT id FROM custom_user);
DELETE FROM accounting_taxrate WHERE created_by_id IN (SELECT id FROM custom_user);

-- Delete business-related data
DELETE FROM analytics_dashboardwidget;
DELETE FROM analytics_dashboard;
DELETE FROM business_location;
DELETE FROM business_businesssettings;

-- Delete document-related data
DELETE FROM documents_documenttemplate;
DELETE FROM documents_document;

-- Delete onboarding and progress data
DELETE FROM onboarding_progress;
DELETE FROM user_progress;

-- Delete banking-related data
DELETE FROM banking_banktransaction;
DELETE FROM banking_bankreconciliation;
DELETE FROM banking_bankaccount;

-- Delete notification preferences
DELETE FROM notifications_notificationpreference;

-- Delete API tokens and sessions
DELETE FROM authtoken_token;
DELETE FROM django_session;

-- Delete audit logs related to users
DELETE FROM django_admin_log WHERE user_id IN (SELECT id FROM custom_user);

-- 2. Delete tenant-related data
DELETE FROM tenant_user_roles;
DELETE FROM tenant_invitations;
DELETE FROM tenants;

-- 3. Finally, delete all users
DELETE FROM custom_user;

-- 4. Reset sequences (PostgreSQL)
-- This ensures new IDs start from 1
SELECT setval('custom_user_id_seq', 1, false);
SELECT setval('hr_employee_id_seq', 1, false);
SELECT setval('hr_department_id_seq', 1, false);

-- Re-enable RLS
ALTER TABLE IF EXISTS custom_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Show results
SELECT 'Deletion complete. Remaining counts:' as status;
SELECT 'Users: ' || COUNT(*) FROM custom_user;
SELECT 'Tenants: ' || COUNT(*) FROM tenants;
SELECT 'Employees: ' || COUNT(*) FROM hr_employee;
SELECT 'Onboarding Progress: ' || COUNT(*) FROM onboarding_progress;

COMMIT;

-- Note: After running this script, you'll have a completely clean database
-- All users will need to sign up again and go through onboarding