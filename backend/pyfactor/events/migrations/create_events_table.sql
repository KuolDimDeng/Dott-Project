-- SQL migration script for Calendar Events app
-- Run this script to create the events table

-- Create the events_event table
CREATE TABLE IF NOT EXISTS events_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    title VARCHAR(255) NOT NULL,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    event_type VARCHAR(20) DEFAULT 'other',
    description TEXT,
    location VARCHAR(255),
    reminder_minutes INTEGER DEFAULT 0 CHECK (reminder_minutes >= 0),
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS events_event_tenant_id_idx ON events_event(tenant_id);
CREATE INDEX IF NOT EXISTS events_event_tenant_start_idx ON events_event(tenant_id, start_datetime);
CREATE INDEX IF NOT EXISTS events_event_tenant_type_idx ON events_event(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS events_event_created_by_idx ON events_event(created_by_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_events_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_event_updated_at_trigger
BEFORE UPDATE ON events_event
FOR EACH ROW
EXECUTE FUNCTION update_events_event_updated_at();

-- Add Row Level Security (RLS) policy
ALTER TABLE events_event ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
CREATE POLICY events_tenant_isolation ON events_event
    FOR ALL
    USING (tenant_id::text = current_setting('app.current_tenant', true))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true));

-- Grant permissions to the application user
GRANT ALL ON events_event TO dott_user;

-- Add table to django_migrations if needed
INSERT INTO django_migrations (app, name, applied)
VALUES ('events', '0001_initial', NOW())
ON CONFLICT (app, name) DO NOTHING;