-- Production Database Query to Check support@dottapps.com Data
-- Run this in production dbshell: python manage.py dbshell

-- ========================================
-- 1. FIND THE USER AND THEIR TENANT INFO
-- ========================================
SELECT 
    '=== USER INFORMATION ===' as section;

SELECT 
    id,
    email,
    business_id,
    tenant_id,
    onboarding_completed,
    created_at::date as created_date
FROM custom_auth_user 
WHERE email = 'support@dottapps.com';

-- ========================================
-- 2. CHECK TENANT DETAILS
-- ========================================
SELECT 
    '=== TENANT INFORMATION ===' as section;

SELECT 
    t.id as tenant_id,
    t.name,
    t.business_name,
    t.created_at::date as created_date,
    COUNT(DISTINCT u.id) as user_count
FROM custom_auth_tenant t
LEFT JOIN custom_auth_user u ON u.business_id = t.id OR u.tenant_id = t.id
WHERE t.id IN (
    SELECT business_id FROM custom_auth_user WHERE email = 'support@dottapps.com'
    UNION
    SELECT tenant_id FROM custom_auth_user WHERE email = 'support@dottapps.com'
)
GROUP BY t.id, t.name, t.business_name, t.created_at;

-- ========================================
-- 3. COUNT DATA FOR THIS USER'S TENANT
-- ========================================
SELECT 
    '=== DATA COUNTS FOR USER TENANT ===' as section;

WITH user_tenant AS (
    SELECT COALESCE(business_id, tenant_id) as tid
    FROM custom_auth_user 
    WHERE email = 'support@dottapps.com'
)
SELECT 
    'Products' as data_type,
    COUNT(*) as count
FROM inventory_product 
WHERE tenant_id = (SELECT tid FROM user_tenant)
UNION ALL
SELECT 
    'Services' as data_type,
    COUNT(*) as count
FROM inventory_service 
WHERE tenant_id = (SELECT tid FROM user_tenant)
UNION ALL
SELECT 
    'Customers' as data_type,
    COUNT(*) as count
FROM crm_customer 
WHERE tenant_id = (SELECT tid FROM user_tenant)
UNION ALL
SELECT 
    'Invoices' as data_type,
    COUNT(*) as count
FROM finance_invoice 
WHERE tenant_id = (SELECT tid FROM user_tenant)
UNION ALL
SELECT 
    'Estimates' as data_type,
    COUNT(*) as count
FROM finance_estimate 
WHERE tenant_id = (SELECT tid FROM user_tenant)
UNION ALL
SELECT 
    'Vendors' as data_type,
    COUNT(*) as count
FROM purchases_vendor 
WHERE tenant_id = (SELECT tid FROM user_tenant)
UNION ALL
SELECT 
    'Employees' as data_type,
    COUNT(*) as count
FROM hr_employee 
WHERE tenant_id = (SELECT tid FROM user_tenant);

-- ========================================
-- 4. CHECK ALL TENANT IDS IN THE SYSTEM
-- ========================================
SELECT 
    '=== ALL TENANTS WITH DATA ===' as section;

SELECT 
    tenant_id,
    COUNT(*) as product_count,
    'Products' as type
FROM inventory_product
GROUP BY tenant_id
HAVING COUNT(*) > 0
ORDER BY product_count DESC
LIMIT 5;

SELECT 
    tenant_id,
    COUNT(*) as invoice_count,
    'Invoices' as type
FROM finance_invoice
GROUP BY tenant_id
HAVING COUNT(*) > 0
ORDER BY invoice_count DESC
LIMIT 5;

-- ========================================
-- 5. CHECK FOR ORPHANED DATA
-- ========================================
SELECT 
    '=== CHECK FOR DATA CREATED BY USER ===' as section;

WITH support_user AS (
    SELECT id FROM custom_auth_user WHERE email = 'support@dottapps.com'
)
SELECT 
    'Invoices created by user' as data_type,
    COUNT(*) as count,
    STRING_AGG(DISTINCT tenant_id::text, ', ') as tenant_ids
FROM finance_invoice 
WHERE created_by_id = (SELECT id FROM support_user)
UNION ALL
SELECT 
    'Products created by user' as data_type,
    COUNT(*) as count,
    STRING_AGG(DISTINCT tenant_id::text, ', ') as tenant_ids
FROM inventory_product 
WHERE created_by_id = (SELECT id FROM support_user)
UNION ALL
SELECT 
    'Customers created by user' as data_type,
    COUNT(*) as count,
    STRING_AGG(DISTINCT tenant_id::text, ', ') as tenant_ids
FROM crm_customer 
WHERE created_by_id = (SELECT id FROM support_user);

-- ========================================
-- 6. SAMPLE DATA CHECK
-- ========================================
SELECT 
    '=== SAMPLE PRODUCTS (FIRST 5) ===' as section;

SELECT 
    name,
    sku,
    price,
    tenant_id,
    created_at::date as created_date
FROM inventory_product
WHERE tenant_id IN (
    SELECT COALESCE(business_id, tenant_id) 
    FROM custom_auth_user 
    WHERE email = 'support@dottapps.com'
)
LIMIT 5;

SELECT 
    '=== SAMPLE INVOICES (FIRST 5) ===' as section;

SELECT 
    invoice_number,
    total_amount,
    status,
    tenant_id,
    created_at::date as created_date
FROM finance_invoice
WHERE tenant_id IN (
    SELECT COALESCE(business_id, tenant_id) 
    FROM custom_auth_user 
    WHERE email = 'support@dottapps.com'
)
LIMIT 5;

-- ========================================
-- 7. DIAGNOSIS SUMMARY
-- ========================================
SELECT 
    '=== DIAGNOSIS ===' as section;

SELECT 
    CASE 
        WHEN COUNT(DISTINCT tenant_id) > 1 THEN 'WARNING: Multiple tenant_ids found for user data'
        WHEN COUNT(DISTINCT tenant_id) = 1 THEN 'OK: Single tenant_id found'
        ELSE 'ERROR: No data found'
    END as diagnosis
FROM (
    SELECT tenant_id FROM inventory_product WHERE created_by_id = (SELECT id FROM custom_auth_user WHERE email = 'support@dottapps.com')
    UNION ALL
    SELECT tenant_id FROM finance_invoice WHERE created_by_id = (SELECT id FROM custom_auth_user WHERE email = 'support@dottapps.com')
) as all_data;