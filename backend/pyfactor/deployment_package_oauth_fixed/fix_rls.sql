-- Script to fix RLS policy issues

-- First, ensure the parameter is properly set 
ALTER DATABASE CURRENT_DATABASE() SET app.current_tenant_id = 'unset';

-- Create a dedicated function to handle tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID) 
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Re-create the test table with proper RLS policy
DROP TABLE IF EXISTS rls_test;

CREATE TABLE IF NOT EXISTS rls_test (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL
);

-- Be explicit about RLS enablement
ALTER TABLE rls_test ENABLE ROW LEVEL SECURITY;

-- Drop and recreate isolation policy with revised condition
DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test;

CREATE POLICY tenant_isolation_policy ON rls_test
AS RESTRICTIVE
USING (
    (tenant_id::TEXT = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset'))
    OR current_setting('app.current_tenant_id', TRUE) = 'unset'
);

-- Insert test data for two different tenants
INSERT INTO rls_test (tenant_id, name)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Tenant 1 - Record 1'),
    ('11111111-1111-1111-1111-111111111111', 'Tenant 1 - Record 2'),
    ('22222222-2222-2222-2222-222222222222', 'Tenant 2 - Record 1'),
    ('22222222-2222-2222-2222-222222222222', 'Tenant 2 - Record 2');

-- Test queries
\echo 'Testing with tenant_id = unset (should see all records)'
SELECT set_config('app.current_tenant_id', 'unset', FALSE);
SELECT * FROM rls_test;

\echo 'Testing with tenant_id = 11111111-1111-1111-1111-111111111111'
SELECT set_config('app.current_tenant_id', '11111111-1111-1111-1111-111111111111', FALSE);
SELECT * FROM rls_test;

\echo 'Testing with tenant_id = 22222222-2222-2222-2222-222222222222'
SELECT set_config('app.current_tenant_id', '22222222-2222-2222-2222-222222222222', FALSE);
SELECT * FROM rls_test;

-- Verify the current session value
\echo 'Current app.current_tenant_id setting:'
SELECT current_setting('app.current_tenant_id', TRUE);

-- Create a function to apply RLS to all tables with tenant_id
CREATE OR REPLACE FUNCTION apply_rls_to_all_tables() 
RETURNS VOID AS $$
DECLARE
    t record;
BEGIN
    FOR t IN 
        SELECT table_schema, table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id'
          AND table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 
                      t.table_schema, t.table_name);
                      
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I.%I', 
                      t.table_schema, t.table_name);
                      
        EXECUTE format('CREATE POLICY tenant_isolation_policy ON %I.%I
                        AS RESTRICTIVE
                        USING (
                          (tenant_id::TEXT = NULLIF(current_setting(''app.current_tenant_id'', TRUE), ''unset''))
                          OR current_setting(''app.current_tenant_id'', TRUE) = ''unset''
                        )', t.table_schema, t.table_name);
                        
        RAISE NOTICE 'Applied RLS policy to %.%', t.table_schema, t.table_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Apply RLS to all tables with tenant_id column
-- UNCOMMENT WHEN READY TO APPLY TO ALL TABLES
-- SELECT apply_rls_to_all_tables(); 