-- Force RLS Fix for PostgreSQL (works for non-superusers)

-- First, check current user
\echo 'Current user:'
SELECT current_user;

-- Create the test table fresh
DROP TABLE IF EXISTS rls_test;

CREATE TABLE rls_test (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL
);

-- Enable RLS with FORCE option to apply to table owner too
ALTER TABLE rls_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE rls_test FORCE ROW LEVEL SECURITY;

-- Drop existing policy if any
DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test;

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation_policy ON rls_test
FOR ALL
TO PUBLIC
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
\echo '\nCurrent settings:'
SELECT current_setting('app.current_tenant_id', true);

-- Test with unset (superuser mode)
\echo '\nTest with tenant_id = unset (should see all records)'
SET LOCAL app.current_tenant_id TO 'unset';
SELECT * FROM rls_test;

-- Test with tenant 1
\echo '\nTest with tenant_id = 11111111-1111-1111-1111-111111111111'
SET LOCAL app.current_tenant_id TO '11111111-1111-1111-1111-111111111111';
SELECT * FROM rls_test;

-- Test with tenant 2
\echo '\nTest with tenant_id = 22222222-2222-2222-2222-222222222222'
SET LOCAL app.current_tenant_id TO '22222222-2222-2222-2222-222222222222';
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
        -- Enable RLS on the table with FORCE option
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 
                      t.table_schema, t.table_name);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 
                      t.table_schema, t.table_name);
                      
        -- Drop existing policies  
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I.%I', 
                      t.table_schema, t.table_name);
                      
        -- Create the correct policy with explicit FOR ALL TO PUBLIC
        EXECUTE format('CREATE POLICY tenant_isolation_policy ON %I.%I
                         FOR ALL
                         TO PUBLIC
                         USING (
                           tenant_id::text = current_setting(''app.current_tenant_id'', true)
                           OR current_setting(''app.current_tenant_id'', true) = ''unset''
                         )', 
                      t.table_schema, t.table_name);
                      
        RAISE NOTICE 'Fixed RLS policy on %.%', t.table_schema, t.table_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute this to fix RLS on all tables
SELECT fix_rls_on_all_tables(); 