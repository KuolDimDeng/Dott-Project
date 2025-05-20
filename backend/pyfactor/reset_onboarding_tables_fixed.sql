-- Drop the onboarding tables completely to reset them
DROP TABLE IF EXISTS onboarding_onboardingprogress CASCADE;

-- Create the onboarding_onboardingprogress table with proper UUID fields
CREATE TABLE onboarding_onboardingprogress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    session_id UUID NULL,
    last_session_activity TIMESTAMP WITH TIME ZONE NULL,
    onboarding_status VARCHAR(50) NOT NULL DEFAULT 'business-info',
    account_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    user_role VARCHAR(20) NOT NULL DEFAULT 'owner',
    subscription_plan VARCHAR(20) NOT NULL DEFAULT 'free',
    current_step VARCHAR(50) NOT NULL DEFAULT 'business-info',
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

-- Create proper indexes on the table
CREATE INDEX onboard_tenant_idx ON onboarding_onboardingprogress(tenant_id);
CREATE INDEX onboard_session_idx ON onboarding_onboardingprogress(session_id);
CREATE UNIQUE INDEX onboard_user_unique_idx ON onboarding_onboardingprogress(user_id);
CREATE INDEX onboard_business_idx ON onboarding_onboardingprogress(business_id);

-- Ensure proper relation constraints
ALTER TABLE onboarding_onboardingprogress 
ADD CONSTRAINT onboarding_onboardingprogress_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES custom_auth_user(id) ON DELETE CASCADE;

ALTER TABLE onboarding_onboardingprogress 
ADD CONSTRAINT onboarding_onboardingprogress_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES users_business(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE onboarding_onboardingprogress ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners
ALTER TABLE onboarding_onboardingprogress FORCE ROW LEVEL SECURITY;

-- Create RLS policy for tenant isolation - simplified version that doesn't require database parameters
CREATE POLICY tenant_isolation_policy ON onboarding_onboardingprogress
FOR ALL
USING (true);  -- This allows all rows to be seen, you'll need to handle tenant filtering in your application

-- Add a comment to remind that tenant filtering should be handled in the application
COMMENT ON TABLE onboarding_onboardingprogress IS 'Table uses Row Level Security. Tenant filtering needs to be handled in the application code.'; 