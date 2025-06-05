-- Fix OnboardingProgress table schema: Convert integer ID to UUID
-- This script fixes the database mismatch causing the "operator does not exist: integer = uuid" error

-- Step 1: Check if table exists and drop it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'onboarding_onboardingprogress'
    ) THEN
        RAISE NOTICE 'Table onboarding_onboardingprogress exists, proceeding with migration...';
        DROP TABLE IF EXISTS onboarding_onboardingprogress CASCADE;
        RAISE NOTICE 'Old table dropped successfully.';
    ELSE
        RAISE NOTICE 'Table onboarding_onboardingprogress does not exist, creating new one.';
    END IF;
END $$;

-- Step 2: Create the table with proper UUID structure matching Django model
CREATE TABLE onboarding_onboardingprogress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    session_id UUID NULL,
    last_session_activity TIMESTAMP WITH TIME ZONE NULL,
    onboarding_status VARCHAR(50) NOT NULL DEFAULT 'business_info',
    account_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    user_role VARCHAR(20) NOT NULL DEFAULT 'owner',
    subscription_plan VARCHAR(20) NOT NULL DEFAULT 'free',
    current_step VARCHAR(50) NOT NULL DEFAULT 'business_info',
    next_step VARCHAR(50) NOT NULL DEFAULT 'subscription',
    completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_active_step VARCHAR(256) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE NULL,
    access_token_expiration TIMESTAMP WITH TIME ZONE NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    database_setup_task_id VARCHAR(255) NULL,
    selected_plan VARCHAR(20) NOT NULL DEFAULT 'free',
    subscription_status VARCHAR(20) NULL,
    billing_cycle VARCHAR(20) NULL DEFAULT 'monthly',
    payment_completed BOOLEAN NOT NULL DEFAULT FALSE,
    payment_method VARCHAR(50) NULL,
    payment_id VARCHAR(100) NULL,
    payment_timestamp TIMESTAMP WITH TIME ZONE NULL,
    rls_setup_completed BOOLEAN NOT NULL DEFAULT FALSE,
    rls_setup_timestamp TIMESTAMP WITH TIME ZONE NULL,
    setup_completed BOOLEAN NOT NULL DEFAULT FALSE,
    setup_timestamp TIMESTAMP WITH TIME ZONE NULL,
    setup_error TEXT NULL,
    schema_name VARCHAR(63) NULL,
    metadata JSONB NULL DEFAULT '{}'::jsonb,
    attribute_version VARCHAR(10) NOT NULL DEFAULT '1.0.0',
    preferences JSONB NULL DEFAULT '{}'::jsonb,
    user_id UUID NOT NULL,
    business_id UUID NULL
);

-- Step 3: Create indexes for better performance
CREATE INDEX onboard_tenant_idx ON onboarding_onboardingprogress(tenant_id);
CREATE INDEX onboard_user_idx ON onboarding_onboardingprogress(user_id);
CREATE INDEX onboard_session_idx ON onboarding_onboardingprogress(session_id);
CREATE INDEX onboard_status_idx ON onboarding_onboardingprogress(onboarding_status);

-- Step 4: Update Django migrations table to reflect the change
INSERT INTO django_migrations (app, name, applied)
VALUES ('onboarding', '0003_fix_uuid_schema', NOW())
ON CONFLICT DO NOTHING;

-- Step 5: Add foreign key constraints (optional - depends on your setup)
-- Note: Uncomment these if you have proper foreign key relationships set up
-- ALTER TABLE onboarding_onboardingprogress 
-- ADD CONSTRAINT fk_onboarding_user 
-- FOREIGN KEY (user_id) REFERENCES custom_auth_user(id) ON DELETE CASCADE;

-- ALTER TABLE onboarding_onboardingprogress 
-- ADD CONSTRAINT fk_onboarding_tenant 
-- FOREIGN KEY (tenant_id) REFERENCES auth_tenant(id) ON DELETE CASCADE;

-- Final status message
DO $$
BEGIN
    RAISE NOTICE 'OnboardingProgress table schema has been fixed with UUID primary key!';
END $$; 