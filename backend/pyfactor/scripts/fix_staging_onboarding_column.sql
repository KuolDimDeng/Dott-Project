-- Fix staging database missing column: onboarding_completed_at
-- This script adds the missing column that's causing login failures

-- Check if column exists first
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='custom_auth_user' 
        AND column_name='onboarding_completed_at'
    ) THEN
        -- Add the missing column
        ALTER TABLE custom_auth_user 
        ADD COLUMN onboarding_completed_at timestamp with time zone;
        
        -- Update existing records where onboarding is completed
        UPDATE custom_auth_user 
        SET onboarding_completed_at = updated_at 
        WHERE onboarding_completed = true 
        AND onboarding_completed_at IS NULL;
        
        RAISE NOTICE 'Column onboarding_completed_at added successfully';
    ELSE
        RAISE NOTICE 'Column onboarding_completed_at already exists';
    END IF;
END $$;

-- Also mark the migration as applied so Django doesn't try to run it again
INSERT INTO django_migrations (app, name, applied)
VALUES ('custom_auth', '0009_user_onboarding_completed', NOW())
ON CONFLICT (app, name) DO NOTHING;

-- Verify the fix
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'custom_auth_user' 
AND column_name IN ('onboarding_completed', 'onboarding_completed_at')
ORDER BY column_name;