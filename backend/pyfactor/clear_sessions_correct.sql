-- Clear user sessions with correct structure

-- 1. Check all sessions for user 250
SELECT 
    session_id,
    user_id,
    tenant_id,
    is_active,
    created_at,
    expires_at
FROM user_sessions 
WHERE user_id = 250
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check what tenant_id is stored in active sessions
SELECT DISTINCT 
    tenant_id,
    COUNT(*) as session_count,
    MAX(created_at) as latest_session
FROM user_sessions 
WHERE user_id = 250 AND is_active = true
GROUP BY tenant_id;

-- 3. Deactivate ALL sessions for user 250 to force refresh
UPDATE user_sessions
SET is_active = false,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = 250 AND is_active = true;

-- 4. Verify all sessions are deactivated
SELECT COUNT(*) as active_sessions
FROM user_sessions 
WHERE user_id = 250 AND is_active = true;

-- 5. Also clear any sessions in Redis by setting expiry
UPDATE user_sessions
SET expires_at = CURRENT_TIMESTAMP
WHERE user_id = 250 AND expires_at > CURRENT_TIMESTAMP;