
-- Drop existing Integrations tables if they exist
DROP TABLE IF EXISTS integrations_integration CASCADE;
DROP TABLE IF EXISTS integrations_integrationconnection CASCADE;

-- Create the integrations_integration table
CREATE TABLE integrations_integration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    integration_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the integrations_integrationconnection table
CREATE TABLE integrations_integrationconnection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token TEXT NULL,
    refresh_token TEXT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NULL,
    connection_data JSONB NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    integration_id UUID NOT NULL REFERENCES integrations_integration(id) ON DELETE CASCADE,
    user_profile_id UUID REFERENCES users_userprofile(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Add content types for Integrations models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('integrations', 'integration'),
    ('integrations', 'integrationconnection')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Integrations migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('integrations', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
