-- Apply Row-Level Security to Location Tracking Tables

-- Enable RLS on hr_locationlog table
ALTER TABLE hr_locationlog ENABLE ROW LEVEL SECURITY;

-- Create policy for hr_locationlog
CREATE POLICY hr_locationlog_tenant_isolation ON hr_locationlog
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Enable RLS on hr_employeelocationconsent table
ALTER TABLE hr_employeelocationconsent ENABLE ROW LEVEL SECURITY;

-- Create policy for hr_employeelocationconsent
CREATE POLICY hr_employeelocationconsent_tenant_isolation ON hr_employeelocationconsent
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Enable RLS on hr_locationcheckin table
ALTER TABLE hr_locationcheckin ENABLE ROW LEVEL SECURITY;

-- Create policy for hr_locationcheckin
CREATE POLICY hr_locationcheckin_tenant_isolation ON hr_locationcheckin
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Grant necessary permissions to app user
GRANT ALL ON hr_locationlog TO your_app_user;
GRANT ALL ON hr_employeelocationconsent TO your_app_user;
GRANT ALL ON hr_locationcheckin TO your_app_user;

-- Note: Replace 'your_app_user' with the actual database user used by your application