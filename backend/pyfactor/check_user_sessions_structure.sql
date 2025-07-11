-- Check user_sessions table structure and clear sessions

-- 1. Check the structure of user_sessions table
\d user_sessions

-- 2. Check all sessions for user 250
SELECT * FROM user_sessions WHERE user_id = 250 LIMIT 5;

-- 3. Deactivate all sessions for user 250 to force refresh
UPDATE user_sessions
SET is_active = false
WHERE user_id = 250;

-- 4. Verify update
SELECT session_id, user_id, tenant_id, is_active, created_at 
FROM user_sessions 
WHERE user_id = 250 
ORDER BY created_at DESC;

-- 5. Also check if there's a Redis session that needs clearing
-- First, let's see what tenant_id is stored in the sessions
SELECT DISTINCT tenant_id 
FROM user_sessions 
WHERE user_id = 250;