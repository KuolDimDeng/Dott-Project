-- Fix onboarding schema - add missing session_id column
-- Safe to run multiple times (uses IF NOT EXISTS)

-- Add session_id column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_onboardingprogress' 
        AND column_name = 'session_id'
    ) THEN
        ALTER TABLE onboarding_onboardingprogress 
        ADD COLUMN session_id UUID NULL;
        
        -- Create index on session_id for performance
        CREATE INDEX IF NOT EXISTS onboard_session_idx 
        ON onboarding_onboardingprogress(session_id);
        
        RAISE NOTICE 'Added session_id column and index to onboarding_onboardingprogress';
    ELSE
        RAISE NOTICE 'session_id column already exists in onboarding_onboardingprogress';
    END IF;
END $$; 