-- Apply Row Level Security to Geofencing tables

-- 1. Enable RLS on hr_geofence table
ALTER TABLE hr_geofence ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS hr_geofence_tenant_isolation ON hr_geofence;

-- Create policy for tenant isolation
CREATE POLICY hr_geofence_tenant_isolation ON hr_geofence
    FOR ALL
    USING (business_id = current_setting('app.current_business_id')::uuid);

-- 2. Enable RLS on hr_employeegeofence table
ALTER TABLE hr_employeegeofence ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS hr_employeegeofence_tenant_isolation ON hr_employeegeofence;

-- Create policy for tenant isolation
CREATE POLICY hr_employeegeofence_tenant_isolation ON hr_employeegeofence
    FOR ALL
    USING (business_id = current_setting('app.current_business_id')::uuid);

-- 3. Enable RLS on hr_geofenceevent table
ALTER TABLE hr_geofenceevent ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS hr_geofenceevent_tenant_isolation ON hr_geofenceevent;

-- Create policy for tenant isolation
CREATE POLICY hr_geofenceevent_tenant_isolation ON hr_geofenceevent
    FOR ALL
    USING (business_id = current_setting('app.current_business_id')::uuid);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_geofence TO django_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_employeegeofence TO django_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_geofenceevent TO django_app;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hr_geofence_business_id ON hr_geofence(business_id);
CREATE INDEX IF NOT EXISTS idx_hr_geofence_is_active ON hr_geofence(is_active);
CREATE INDEX IF NOT EXISTS idx_hr_geofence_location_type ON hr_geofence(location_type);

CREATE INDEX IF NOT EXISTS idx_hr_employeegeofence_business_id ON hr_employeegeofence(business_id);
CREATE INDEX IF NOT EXISTS idx_hr_employeegeofence_employee_id ON hr_employeegeofence(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_employeegeofence_geofence_id ON hr_employeegeofence(geofence_id);
CREATE INDEX IF NOT EXISTS idx_hr_employeegeofence_is_active ON hr_employeegeofence(is_active);

CREATE INDEX IF NOT EXISTS idx_hr_geofenceevent_business_id ON hr_geofenceevent(business_id);
CREATE INDEX IF NOT EXISTS idx_hr_geofenceevent_employee_id ON hr_geofenceevent(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_geofenceevent_geofence_id ON hr_geofenceevent(geofence_id);
CREATE INDEX IF NOT EXISTS idx_hr_geofenceevent_event_type ON hr_geofenceevent(event_type);
CREATE INDEX IF NOT EXISTS idx_hr_geofenceevent_event_time ON hr_geofenceevent(event_time);

-- Create spatial index for geofence locations (if PostGIS is available)
-- CREATE INDEX IF NOT EXISTS idx_hr_geofence_location ON hr_geofence USING GIST (ST_MakePoint(center_longitude, center_latitude));