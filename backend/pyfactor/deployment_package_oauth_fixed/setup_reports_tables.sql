
-- Drop existing Reports tables if they exist
DROP TABLE IF EXISTS reports_report CASCADE;
DROP TABLE IF EXISTS reports_reportschedule CASCADE;

-- Create the reports_report table
CREATE TABLE reports_report (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    results JSONB,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_profile_id UUID REFERENCES users_userprofile(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Create the reports_reportschedule table
CREATE TABLE reports_reportschedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frequency VARCHAR(50) NOT NULL,
    next_run TIMESTAMP WITH TIME ZONE NOT NULL,
    recipients JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    report_id UUID NOT NULL REFERENCES reports_report(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Add content types for Reports models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('reports', 'report'),
    ('reports', 'reportschedule')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Reports migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('reports', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
