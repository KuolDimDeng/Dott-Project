-- Check what tenant_id is stored in sessions for support@dottapps.com

-- 1. Check active sessions and their tenant_id
SELECT 
    session_id,
    user_id,
    tenant_id,
    is_active,
    session_data->>'business_id' as session_business_id,
    session_data->>'tenant_id' as session_tenant_id,
    created_at,
    expires_at
FROM user_sessions 
WHERE user_id = 250 
AND is_active = true
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check the user's current business_id
SELECT 
    id,
    email,
    business_id,
    tenant_id
FROM custom_auth_user 
WHERE id = 250;

-- 3. Check the tenant record
SELECT 
    id,
    name,
    schema_name,
    created_at
FROM custom_auth_tenant
WHERE id = (
    SELECT tenant_id 
    FROM custom_auth_user 
    WHERE id = 250
);