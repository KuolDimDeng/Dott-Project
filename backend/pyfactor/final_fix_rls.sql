-- Final fix for Row Level Security (RLS) issues

-- First, ensure the database has the custom setting properly registered
SELECT set_config('app.current_tenant_id', 'unset', false);

-- Create a separate DB parameter that can be set at DB level
ALTER DATABASE CURRENT_DATABASE() SET app.current_tenant_id = 'unset';

-- Create the test table
DROP TABLE IF EXISTS rls_test;

CREATE TABLE rls_test (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL
);

-- Key fix: Use a simpler policy with explicit type cast and direct comparison
ALTER TABLE rls_test ENABLE ROW LEVEL SECURITY;

-- You must own the table to enable RLS
ALTER TABLE rls_test OWNER TO dott_admin;

-- Drop existing policy if any
DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test;

-- Create a simple policy that does a direct text comparison
CREATE POLICY tenant_isolation_policy ON rls_test
USING (
    tenant_id::text = current_setting('app.current_tenant_id', true) 
    OR 
    current_setting('app.current_tenant_id', true) = 'unset'
);

-- Insert test data
INSERT INTO rls_test (tenant_id, name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Tenant 1 - Record 1'),
    ('11111111-1111-1111-1111-111111111111', 'Tenant 1 - Record 2'),
    ('22222222-2222-2222-2222-222222222222', 'Tenant 2 - Record 1'),
    ('22222222-2222-2222-2222-222222222222', 'Tenant 2 - Record 2');

-- Test with various tenant contexts
\echo 'Current RLS setup'
SELECT current_setting('app.current_tenant_id', true);

-- Force a reload of settings
SELECT pg_reload_conf();

-- Check what user we have and make sure we have RLS permissions
\echo 'Current user:'
SELECT current_user;

-- Test with unset (superuser mode)
\echo '\nTest with tenant_id = unset (should see all records)'
SET app.current_tenant_id TO 'unset';
SELECT * FROM rls_test;

-- Test with tenant 1
\echo '\nTest with tenant_id = 11111111-1111-1111-1111-111111111111'
SET app.current_tenant_id TO '11111111-1111-1111-1111-111111111111';
SELECT * FROM rls_test;

-- Test with tenant 2
\echo '\nTest with tenant_id = 22222222-2222-2222-2222-222222222222'
SET app.current_tenant_id TO '22222222-2222-2222-2222-222222222222';
SELECT * FROM rls_test;

-- Function to apply this fixed RLS policy to all tables with tenant_id
CREATE OR REPLACE FUNCTION fix_rls_on_all_tables() 
RETURNS void AS $$
DECLARE
    t record;
BEGIN
    FOR t IN 
        SELECT table_schema, table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id'
          AND table_schema = 'public'
    LOOP
        -- Enable RLS on the table
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 
                      t.table_schema, t.table_name);
                      
        -- Drop existing policies  
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I.%I', 
                      t.table_schema, t.table_name);
                      
        -- Create the simpler, more direct policy
        EXECUTE format('CREATE POLICY tenant_isolation_policy ON %I.%I
                         USING (
                           tenant_id::text = current_setting(''app.current_tenant_id'', true)
                           OR current_setting(''app.current_tenant_id'', true) = ''unset''
                         )', 
                      t.table_schema, t.table_name);
                      
        RAISE NOTICE 'Fixed RLS policy on %.%', t.table_schema, t.table_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- To apply the fixed policy to all tables, run:
-- SELECT fix_rls_on_all_tables(); 