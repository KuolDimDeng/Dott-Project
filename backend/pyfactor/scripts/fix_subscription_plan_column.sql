-- Direct SQL to add subscription_plan column if migration fails
-- Run this in Render database console if needed

-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'custom_auth_user' 
AND column_name = 'subscription_plan';

-- Add column if it doesn't exist
ALTER TABLE custom_auth_user 
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free' 
CHECK (subscription_plan IN ('free', 'professional', 'enterprise'));

-- Verify it was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'custom_auth_user' 
AND column_name = 'subscription_plan';