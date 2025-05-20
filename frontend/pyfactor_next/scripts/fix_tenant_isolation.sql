
-- Drop existing tenant context functions to avoid conflicts
DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS get_tenant_context() CASCADE;
DROP FUNCTION IF EXISTS get_current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS set_tenant_context(text) CASCADE;
DROP FUNCTION IF EXISTS clear_tenant_context() CASCADE;

-- Create improved functions with better isolation and parameter handling

-- Get the current tenant context with improved error handling
CREATE OR REPLACE FUNCTION get_tenant_context()
RETURNS text AS $$
DECLARE
    tenant_value text;
BEGIN
    -- Try to get the setting, return 'unset' if it doesn't exist or is NULL
    BEGIN
        tenant_value := current_setting('app.current_tenant_id', TRUE);
    EXCEPTION WHEN OTHERS THEN
        tenant_value := NULL;
    END;
    
    RETURN COALESCE(tenant_value, 'unset');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- For use in RLS policies - SECURITY INVOKER to run in the policy's context
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS text AS $$
DECLARE
    tenant_value text;
BEGIN
    -- Direct access to setting to ensure proper context in RLS
    BEGIN
        tenant_value := current_setting('app.current_tenant_id', TRUE);
    EXCEPTION WHEN OTHERS THEN
        tenant_value := NULL;
    END;
    
    RETURN COALESCE(tenant_value, 'unset');
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Set tenant context (SECURITY DEFINER for permission to set parameter)
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id text)
RETURNS text AS $$
BEGIN
    -- Validate and set as session parameter
    IF tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant ID cannot be NULL';
    END IF;
    
    -- Set parameter at session level (FALSE) not transaction level
    PERFORM set_config('app.current_tenant_id', tenant_id, FALSE);
    
    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clear tenant context (SECURITY DEFINER for permission)
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS text AS $$
BEGIN
    -- Set special 'unset' value for admin access
    PERFORM set_config('app.current_tenant_id', 'unset', FALSE);
    
    RETURN 'unset';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create test table and policy if it doesn't exist
CREATE TABLE IF NOT EXISTS rls_test_isolation (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    business_id TEXT NULL,
    data TEXT NOT NULL
);

-- Enable RLS on the test table
ALTER TABLE rls_test_isolation ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test_isolation;

-- Create policy to enforce tenant isolation
CREATE POLICY tenant_isolation_policy ON rls_test_isolation
AS RESTRICTIVE
USING (
    (tenant_id::TEXT = current_tenant_id())
    OR current_tenant_id() = 'unset'
);

-- Clear existing test data
TRUNCATE TABLE rls_test_isolation;

-- Insert test data
INSERT INTO rls_test_isolation (tenant_id, business_id, data)
VALUES 
    ('tenant1', 'tenant1', 'Data for tenant 1'),
    ('tenant1', 'tenant1', 'More data for tenant 1'),
    ('tenant2', 'tenant2', 'Data for tenant 2'),
    ('tenant2', 'tenant2', 'More data for tenant 2');
