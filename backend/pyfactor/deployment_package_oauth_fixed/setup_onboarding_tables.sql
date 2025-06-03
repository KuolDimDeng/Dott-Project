
-- Drop existing Onboarding tables if they exist
DROP TABLE IF EXISTS onboarding_onboardingstatus CASCADE;

-- Create the onboarding_onboardingstatus table
CREATE TABLE onboarding_onboardingstatus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(50) NOT NULL,
    completed_steps JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_step VARCHAR(100),
    progress INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Add content types for Onboarding models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('onboarding', 'onboardingstatus')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Onboarding migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('onboarding', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
