-- Fix onboarding schema - add missing columns
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
        
        RAISE NOTICE 'Added session_id column to onboarding_onboardingprogress';
    ELSE
        RAISE NOTICE 'session_id column already exists in onboarding_onboardingprogress';
    END IF;
END $$; 

-- Add last_session_activity column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_onboardingprogress' 
        AND column_name = 'last_session_activity'
    ) THEN
        ALTER TABLE onboarding_onboardingprogress 
        ADD COLUMN last_session_activity TIMESTAMP WITH TIME ZONE NULL;
        
        RAISE NOTICE 'Added last_session_activity column to onboarding_onboardingprogress';
    ELSE
        RAISE NOTICE 'last_session_activity column already exists in onboarding_onboardingprogress';
    END IF;
END $$; 

-- Add business_id column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_onboardingprogress' 
        AND column_name = 'business_id'
    ) THEN
        ALTER TABLE onboarding_onboardingprogress 
        ADD COLUMN business_id UUID NULL;
        
        RAISE NOTICE 'Added business_id column to onboarding_onboardingprogress';
    ELSE
        RAISE NOTICE 'business_id column already exists in onboarding_onboardingprogress';
    END IF;
END $$; 

-- Add account_status column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_onboardingprogress' 
        AND column_name = 'account_status'
    ) THEN
        ALTER TABLE onboarding_onboardingprogress 
        ADD COLUMN account_status VARCHAR(50) NULL DEFAULT 'pending';
        
        RAISE NOTICE 'Added account_status column to onboarding_onboardingprogress';
    ELSE
        RAISE NOTICE 'account_status column already exists in onboarding_onboardingprogress';
    END IF;
END $$; 

-- Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS onboard_session_idx 
ON onboarding_onboardingprogress(session_id);

CREATE INDEX IF NOT EXISTS onboard_activity_idx 
ON onboarding_onboardingprogress(last_session_activity);

CREATE INDEX IF NOT EXISTS onboard_business_idx 
ON onboarding_onboardingprogress(business_id);

CREATE INDEX IF NOT EXISTS onboard_account_status_idx 
ON onboarding_onboardingprogress(account_status);

-- Show final schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'onboarding_onboardingprogress' 
AND column_name IN ('session_id', 'last_session_activity', 'business_id', 'account_status')
ORDER BY column_name; 