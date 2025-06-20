-- =====================================================
-- DELETE ALL USER DATA FOR FRESH TESTING
-- =====================================================
-- WARNING: This will permanently delete ALL user data!
-- Only use this in development/testing environments
-- =====================================================

-- Start transaction
BEGIN;

-- Disable foreign key checks temporarily (PostgreSQL)
SET session_replication_role = 'replica';

-- Delete from all tenant schemas first
DO $$
DECLARE
    tenant_schema TEXT;
BEGIN
    -- Loop through all tenant schemas
    FOR tenant_schema IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        -- Delete data from each tenant schema
        EXECUTE format('
            -- Delete from transaction tables
            DELETE FROM %I.accounts_transaction;
            DELETE FROM %I.accounts_recurringtransaction;
            
            -- Delete from invoice tables
            DELETE FROM %I.accounts_payment;
            DELETE FROM %I.accounts_invoiceitem;
            DELETE FROM %I.accounts_invoice;
            
            -- Delete from inventory tables
            DELETE FROM %I.inventory_inventoryadjustment;
            DELETE FROM %I.inventory_inventorytransaction;
            DELETE FROM %I.inventory_inventory;
            DELETE FROM %I.inventory_product;
            
            -- Delete from accounts tables
            DELETE FROM %I.accounts_account;
            DELETE FROM %I.accounts_category;
            DELETE FROM %I.accounts_customer;
            DELETE FROM %I.accounts_vendor;
            
            -- Delete from business profile
            DELETE FROM %I.accounts_businessprofile;
        ', 
        tenant_schema, tenant_schema, tenant_schema, tenant_schema, 
        tenant_schema, tenant_schema, tenant_schema, tenant_schema,
        tenant_schema, tenant_schema, tenant_schema, tenant_schema,
        tenant_schema, tenant_schema, tenant_schema, tenant_schema,
        tenant_schema);
        
        -- Drop the schema
        EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', tenant_schema);
        
        RAISE NOTICE 'Deleted tenant schema: %', tenant_schema;
    END LOOP;
END $$;

-- Delete from public schema tables in correct order to avoid FK violations

-- 1. Delete payment/subscription related data
DELETE FROM public.accounts_stripesubscription;
DELETE FROM public.accounts_paymentintent;
DELETE FROM public.accounts_stripecustomer;

-- 2. Delete tenant membership data
DELETE FROM public.accounts_tenantusermembership;

-- 3. Delete tenant data
DELETE FROM public.accounts_tenant;

-- 4. Delete session data
DELETE FROM public.django_session;
DELETE FROM public.accounts_usersession;

-- 5. Delete user activity data
DELETE FROM public.accounts_useractivity;
DELETE FROM public.accounts_userloginhistory;

-- 6. Delete Auth0 related data
DELETE FROM public.accounts_auth0user;

-- 7. Delete onboarding data
DELETE FROM public.accounts_onboardingprogress;

-- 8. Finally, delete all users
DELETE FROM public.accounts_customuser;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Show counts to verify deletion
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Deletion Summary ===';
    RAISE NOTICE 'Users remaining: %', (SELECT COUNT(*) FROM public.accounts_customuser);
    RAISE NOTICE 'Tenants remaining: %', (SELECT COUNT(*) FROM public.accounts_tenant);
    RAISE NOTICE 'Sessions remaining: %', (SELECT COUNT(*) FROM public.django_session);
    RAISE NOTICE 'Tenant schemas remaining: %', (SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%');
    RAISE NOTICE '========================';
END $$;

-- Commit the transaction
COMMIT;

-- Vacuum to reclaim space
VACUUM ANALYZE;