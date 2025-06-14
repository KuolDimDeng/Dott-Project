-- Script to delete a SINGLE user and all their associated data
-- Replace 'admin@dottapps.com' with the email of the user you want to delete

DO $$
DECLARE
    target_user_id INTEGER;
    target_tenant_id UUID;
    target_email TEXT := 'admin@dottapps.com'; -- CHANGE THIS TO THE USER YOU WANT TO DELETE
BEGIN
    -- Get the user ID
    SELECT id INTO target_user_id FROM custom_user WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User % not found', target_email;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user % with ID %', target_email, target_user_id;
    
    -- Get the tenant ID(s) for this user
    SELECT id INTO target_tenant_id FROM tenants WHERE owner_id = target_user_id::TEXT;
    
    -- Start deletion process
    RAISE NOTICE 'Starting deletion process for user %...', target_email;
    
    -- Delete payroll data
    DELETE FROM payroll_payslip WHERE created_by_id = target_user_id;
    DELETE FROM payroll_taxcalculation WHERE created_by_id = target_user_id;
    DELETE FROM payroll_payrollrecord WHERE employee_id IN (
        SELECT id FROM hr_employee WHERE tenant_id = target_tenant_id
    );
    DELETE FROM payroll_payrollperiod WHERE created_by_id = target_user_id;
    
    -- Delete HR data
    DELETE FROM hr_employeedocument WHERE employee_id IN (
        SELECT id FROM hr_employee WHERE tenant_id = target_tenant_id
    );
    DELETE FROM hr_employeebenefit WHERE employee_id IN (
        SELECT id FROM hr_employee WHERE tenant_id = target_tenant_id
    );
    DELETE FROM hr_attendance WHERE employee_id IN (
        SELECT id FROM hr_employee WHERE tenant_id = target_tenant_id
    );
    DELETE FROM hr_leave WHERE employee_id IN (
        SELECT id FROM hr_employee WHERE tenant_id = target_tenant_id
    );
    DELETE FROM hr_employee WHERE tenant_id = target_tenant_id;
    DELETE FROM hr_department WHERE tenant_id = target_tenant_id;
    
    -- Delete inventory data
    DELETE FROM inventory_stockmovement WHERE created_by_id = target_user_id;
    DELETE FROM inventory_inventoryitem WHERE created_by_id = target_user_id;
    DELETE FROM inventory_category WHERE created_by_id = target_user_id;
    DELETE FROM inventory_supplier WHERE created_by_id = target_user_id;
    
    -- Delete accounting data
    DELETE FROM accounting_journalentry WHERE created_by_id = target_user_id;
    DELETE FROM accounting_transaction WHERE created_by_id = target_user_id;
    DELETE FROM accounting_invoice WHERE created_by_id = target_user_id;
    DELETE FROM accounting_account WHERE created_by_id = target_user_id;
    DELETE FROM accounting_taxrate WHERE created_by_id = target_user_id;
    
    -- Delete business data
    DELETE FROM analytics_dashboardwidget WHERE dashboard_id IN (
        SELECT id FROM analytics_dashboard WHERE tenant_id = target_tenant_id
    );
    DELETE FROM analytics_dashboard WHERE tenant_id = target_tenant_id;
    DELETE FROM business_location WHERE tenant_id = target_tenant_id;
    DELETE FROM business_businesssettings WHERE tenant_id = target_tenant_id;
    
    -- Delete documents
    DELETE FROM documents_documenttemplate WHERE tenant_id = target_tenant_id;
    DELETE FROM documents_document WHERE tenant_id = target_tenant_id;
    
    -- Delete onboarding progress
    DELETE FROM onboarding_progress WHERE user_id = target_user_id;
    DELETE FROM user_progress WHERE user_id = target_user_id;
    
    -- Delete banking data
    DELETE FROM banking_banktransaction WHERE bank_account_id IN (
        SELECT id FROM banking_bankaccount WHERE tenant_id = target_tenant_id
    );
    DELETE FROM banking_bankreconciliation WHERE bank_account_id IN (
        SELECT id FROM banking_bankaccount WHERE tenant_id = target_tenant_id
    );
    DELETE FROM banking_bankaccount WHERE tenant_id = target_tenant_id;
    
    -- Delete notifications
    DELETE FROM notifications_notificationpreference WHERE user_id = target_user_id;
    
    -- Delete tokens and sessions
    DELETE FROM authtoken_token WHERE user_id = target_user_id;
    
    -- Delete audit logs
    DELETE FROM django_admin_log WHERE user_id = target_user_id;
    
    -- Delete tenant data
    DELETE FROM tenant_user_roles WHERE user_id = target_user_id OR tenant_id = target_tenant_id;
    DELETE FROM tenant_invitations WHERE tenant_id = target_tenant_id;
    DELETE FROM tenants WHERE id = target_tenant_id;
    
    -- Finally, delete the user
    DELETE FROM custom_user WHERE id = target_user_id;
    
    RAISE NOTICE 'Successfully deleted user % and all associated data', target_email;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting user %: %', target_email, SQLERRM;
        RAISE;
END $$;