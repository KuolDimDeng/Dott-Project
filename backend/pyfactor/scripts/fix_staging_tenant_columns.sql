-- Fix missing columns in custom_auth_tenant table
-- Run this in psql connected to the staging database

-- Add deactivated_at column
ALTER TABLE custom_auth_tenant 
ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone;

-- Add is_recoverable column
ALTER TABLE custom_auth_tenant 
ADD COLUMN IF NOT EXISTS is_recoverable boolean;

-- Add setup_status column
ALTER TABLE custom_auth_tenant 
ADD COLUMN IF NOT EXISTS setup_status character varying(20);

-- Add last_health_check column
ALTER TABLE custom_auth_tenant 
ADD COLUMN IF NOT EXISTS last_health_check timestamp with time zone;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'custom_auth_tenant' 
AND column_name IN ('deactivated_at', 'is_recoverable', 'setup_status', 'last_health_check')
ORDER BY column_name;