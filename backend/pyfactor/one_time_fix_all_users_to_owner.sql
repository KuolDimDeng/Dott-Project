-- One-time script to update all existing users to OWNER role
-- This fixes users who were created with the old default of 'USER'
-- Run this ONCE in production after deployment

-- First, let's see what we're about to change
SELECT email, role, date_joined 
FROM custom_auth_user 
WHERE role = 'USER' OR role IS NULL
ORDER BY date_joined;

-- Update all users with 'USER' role to 'OWNER'
UPDATE custom_auth_user 
SET role = 'OWNER' 
WHERE role = 'USER' OR role IS NULL;

-- Verify the update
SELECT role, COUNT(*) as count 
FROM custom_auth_user 
GROUP BY role;

-- Show the updated users
SELECT email, role, date_joined 
FROM custom_auth_user 
WHERE role = 'OWNER'
ORDER BY date_joined DESC
LIMIT 10;