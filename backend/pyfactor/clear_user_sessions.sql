-- Clear user sessions to force refresh with correct business_id

-- 1. Check current sessions for support@dottapps.com
SELECT 
    id,
    user_id,
    tenant_id,
    is_active,
    created_at
FROM user_sessions
WHERE user_id = 250  -- support@dottapps.com user ID
ORDER BY created_at DESC;

-- 2. Deactivate all sessions for this user to force refresh
UPDATE user_sessions
SET is_active = false
WHERE user_id = 250;

-- 3. Verify sessions are deactivated
SELECT 
    id,
    is_active,
    updated_at
FROM user_sessions
WHERE user_id = 250
ORDER BY updated_at DESC;