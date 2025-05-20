-- 1. Query to examine the custom_auth_tenant table structure
\d custom_auth_tenant

-- 2. Get count of users per tenant
SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    COUNT(u.id) AS user_count
FROM 
    custom_auth_tenant t
LEFT JOIN 
    custom_auth_user u ON u.tenant_id = t.id
GROUP BY 
    t.id, t.name
ORDER BY 
    user_count DESC;

-- 3. Get all businesses associated with each tenant
SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    b.id AS business_id,
    b.name AS business_name,
    b.business_type,
    b.created_at AS business_created
FROM 
    custom_auth_tenant t
LEFT JOIN 
    users_business b ON b.tenant_id = t.id
ORDER BY 
    t.name, b.name;

-- 4. Get tenant usage statistics
SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    COUNT(DISTINCT cu.id) AS user_count,
    COUNT(DISTINCT b.id) AS business_count,
    COUNT(DISTINCT p.id) AS product_count,
    COUNT(DISTINCT i.id) AS invoice_count
FROM 
    custom_auth_tenant t
LEFT JOIN 
    custom_auth_user cu ON cu.tenant_id = t.id
LEFT JOIN 
    users_business b ON b.tenant_id = t.id
LEFT JOIN 
    inventory_product p ON p.tenant_id = t.id
LEFT JOIN 
    sales_invoice i ON i.tenant_id = t.id
GROUP BY 
    t.id, t.name
ORDER BY 
    user_count DESC;

-- 5. List all users with their tenant information
SELECT 
    u.id AS user_id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    t.id AS tenant_id,
    t.name AS tenant_name,
    up.role,
    b.name AS business_name
FROM 
    custom_auth_user u
LEFT JOIN 
    custom_auth_tenant t ON u.tenant_id = t.id
LEFT JOIN 
    users_userprofile up ON up.user_id = u.id
LEFT JOIN 
    users_business b ON up.business_id = b.id
ORDER BY 
    u.date_joined DESC;

-- 6. Get UUID formatted tenant IDs that match the 14c8e478-e011-7016-d015-0a7a0aee445e format
SELECT 
    id, 
    name, 
    owner_id
FROM 
    custom_auth_tenant
WHERE 
    id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
LIMIT 10;
