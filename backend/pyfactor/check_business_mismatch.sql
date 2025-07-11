-- Check business_id mismatch issue

-- 1. Check if the business_id in your user record actually exists
SELECT * FROM users_business 
WHERE id = '05ce07dc-929f-404c-bef0-7f4692da95be';

-- 2. Check all businesses (with better formatting)
SELECT 
    id,
    name,
    owner_id,
    created_at
FROM users_business
ORDER BY created_at DESC;

-- 3. Check if your user is the owner of any business
SELECT 
    b.id as business_id,
    b.name as business_name,
    b.owner_id,
    u.id as user_id,
    u.email as user_email
FROM users_business b
JOIN custom_auth_user u ON b.owner_id::text = u.id::text
WHERE u.email = 'support@dottapps.com';

-- 4. Check your user's full details
SELECT 
    id,
    email,
    business_id,
    tenant_id,
    onboarding_completed,
    created_at
FROM custom_auth_user
WHERE email = 'support@dottapps.com';

-- 5. Check if there's a tenant mismatch
SELECT 
    u.id as user_id,
    u.email,
    u.business_id as user_business_id,
    u.tenant_id,
    t.id as tenant_id_from_table,
    t.name as tenant_name,
    t.schema_name
FROM custom_auth_user u
LEFT JOIN users_tenant t ON u.tenant_id = t.id
WHERE u.email = 'support@dottapps.com';