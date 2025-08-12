-- Check what data exists for support@dottapps.com

-- First, find the user
SELECT id, email, business_id, tenant_id, onboarding_completed, created_at
FROM custom_auth_user
WHERE email = 'support@dottapps.com';

-- Check tenants
SELECT id, name, business_name, created_at
FROM custom_auth_tenant
WHERE id IN (
    SELECT business_id FROM custom_auth_user WHERE email = 'support@dottapps.com'
    UNION
    SELECT tenant_id FROM custom_auth_user WHERE email = 'support@dottapps.com'
);

-- Count products for this tenant
SELECT COUNT(*) as product_count, tenant_id
FROM inventory_product
WHERE tenant_id IN (
    SELECT business_id FROM custom_auth_user WHERE email = 'support@dottapps.com'
    UNION
    SELECT tenant_id FROM custom_auth_user WHERE email = 'support@dottapps.com'
)
GROUP BY tenant_id;

-- Count services
SELECT COUNT(*) as service_count, tenant_id
FROM inventory_service
WHERE tenant_id IN (
    SELECT business_id FROM custom_auth_user WHERE email = 'support@dottapps.com'
    UNION
    SELECT tenant_id FROM custom_auth_user WHERE email = 'support@dottapps.com'
)
GROUP BY tenant_id;

-- Count customers
SELECT COUNT(*) as customer_count, tenant_id
FROM crm_customer
WHERE tenant_id IN (
    SELECT business_id FROM custom_auth_user WHERE email = 'support@dottapps.com'
    UNION
    SELECT tenant_id FROM custom_auth_user WHERE email = 'support@dottapps.com'
)
GROUP BY tenant_id;

-- Count invoices
SELECT COUNT(*) as invoice_count, tenant_id
FROM finance_invoice
WHERE tenant_id IN (
    SELECT business_id FROM custom_auth_user WHERE email = 'support@dottapps.com'
    UNION
    SELECT tenant_id FROM custom_auth_user WHERE email = 'support@dottapps.com'
)
GROUP BY tenant_id;

-- Check if there's data under different tenant_ids
SELECT 'Products' as type, tenant_id, COUNT(*) as count
FROM inventory_product
GROUP BY tenant_id
UNION ALL
SELECT 'Services' as type, tenant_id, COUNT(*) as count
FROM inventory_service
GROUP BY tenant_id
UNION ALL
SELECT 'Customers' as type, tenant_id, COUNT(*) as count
FROM crm_customer
GROUP BY tenant_id
UNION ALL
SELECT 'Invoices' as type, tenant_id, COUNT(*) as count
FROM finance_invoice
GROUP BY tenant_id
ORDER BY type, count DESC;