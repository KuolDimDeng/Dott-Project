-- Drop the session_id column if it exists and recreate it as UUID
ALTER TABLE onboarding_onboardingprogress DROP COLUMN IF EXISTS session_id;

-- Add the session_id field with the correct UUID type
ALTER TABLE onboarding_onboardingprogress 
ADD COLUMN session_id UUID NULL;

-- Create index on session_id
CREATE INDEX IF NOT EXISTS onboard_session_idx ON onboarding_onboardingprogress(session_id); 