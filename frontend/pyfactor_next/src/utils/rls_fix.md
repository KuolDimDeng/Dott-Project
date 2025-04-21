# PostgreSQL Row Level Security (RLS) Troubleshooting Guide

This document provides instructions for fixing Row Level Security (RLS) issues in the PyFactor application.

## Understanding RLS Errors

The errors you're seeing in the logs indicate that RLS is not properly configured:

```
ERROR 2025-04-18 17:32:27,344 rls RLS Test 1 failed: Expected 1 row for tenant1, got 4
ERROR 2025-04-18 17:32:27,474 middleware Row Level Security (RLS) is NOT properly configured! (Attempt 1/3)
```

This means that when the tenant context is set to a specific tenant, PostgreSQL is not correctly filtering rows.

## Fix Database RLS Configuration

To fix RLS issues, connect to your PostgreSQL database and run the following SQL commands:

### 1. Create RLS Helper Functions (if they don't exist)

```sql
-- Create function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT) RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id, false);
END;
$$ LANGUAGE plpgsql;

-- Create function to clear tenant context
CREATE OR REPLACE FUNCTION clear_tenant_context() RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', 'unset', false);
END;
$$ LANGUAGE plpgsql;

-- Create function to test if RLS is working for a table
CREATE OR REPLACE FUNCTION test_rls_for_table(table_name TEXT) RETURNS TABLE(
  rls_working BOOLEAN,
  expected_rows INT,
  actual_rows INT
) AS $$
DECLARE
  total_rows INT;
  tenant_rows INT;
BEGIN
  EXECUTE 'SELECT count(*) FROM ' || table_name INTO total_rows;
  
  PERFORM set_tenant_context('tenant1');
  EXECUTE 'SELECT count(*) FROM ' || table_name INTO tenant_rows;
  PERFORM clear_tenant_context();
  
  expected_rows := 1;
  actual_rows := tenant_rows;
  rls_working := tenant_rows = 1;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
```

### 2. Identify Tables Missing RLS

```sql
-- Create a query to check all tables with tenant_id
CREATE OR REPLACE FUNCTION check_all_rls_tables() RETURNS TABLE(
  table_name TEXT,
  has_tenant_id BOOLEAN,
  rls_enabled BOOLEAN,
  has_policy BOOLEAN,
  needs_fix BOOLEAN
) AS $$
BEGIN
  FOR table_name IN 
    SELECT c.relname 
    FROM pg_class c 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE n.nspname = 'public' 
    AND c.relkind = 'r' 
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE 'sql_%'
  LOOP
    -- Check if table has tenant_id column
    has_tenant_id := EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = table_name 
      AND column_name = 'tenant_id'
    );
    
    -- Check if RLS is enabled
    rls_enabled := EXISTS (
      SELECT 1 FROM pg_class 
      WHERE relname = table_name 
      AND relrowsecurity = true
    );
    
    -- Check if table has RLS policy
    has_policy := EXISTS (
      SELECT 1 FROM pg_policy 
      WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = table_name)
    );
    
    -- Determine if table needs fixing
    needs_fix := has_tenant_id AND (NOT rls_enabled OR NOT has_policy);
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run it
SELECT * FROM check_all_rls_tables() WHERE needs_fix = true;
```

### 3. Apply RLS Fixes to Tables Missing RLS

For each table identified by the above query:

```sql
-- Replace 'your_table' with the actual table name
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON your_table;
CREATE POLICY tenant_isolation_policy ON your_table
AS RESTRICTIVE
USING (
  (tenant_id::TEXT = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset'))
  OR current_setting('app.current_tenant_id', TRUE) = 'unset'
);
```

### 4. Create Test Data for Verification

```sql
-- Create test RLS table if it doesn't exist
CREATE TABLE IF NOT EXISTS test_rls_table (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT
);

-- Clear existing test data
DELETE FROM test_rls_table;

-- Insert test data
INSERT INTO test_rls_table (tenant_id, name) VALUES 
('tenant1', 'Test 1'),
('tenant2', 'Test 2'),
('tenant3', 'Test 3'),
('tenant4', 'Test 4');

-- Enable RLS on test table
ALTER TABLE test_rls_table ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS tenant_isolation_policy ON test_rls_table;
CREATE POLICY tenant_isolation_policy ON test_rls_table
AS RESTRICTIVE
USING (
  (tenant_id::TEXT = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset'))
  OR current_setting('app.current_tenant_id', TRUE) = 'unset'
);
```

### 5. Test RLS After Fixes

```sql
-- Test with unset context (should show all rows)
SELECT clear_tenant_context();
SELECT * FROM test_rls_table;

-- Test with tenant1 context (should show only tenant1 rows)
SELECT set_tenant_context('tenant1');
SELECT * FROM test_rls_table;

-- Test with tenant2 context (should show only tenant2 rows)
SELECT set_tenant_context('tenant2');
SELECT * FROM test_rls_table;

-- Clear context when done
SELECT clear_tenant_context();

-- Test all tables
SELECT table_name, test_rls_for_table(table_name) 
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name NOT LIKE 'pg_%'
AND table_name NOT LIKE 'sql_%'
ORDER BY table_name;
```

## Integration with Application Code

In your application code, make sure to:

1. Set tenant context before all database operations
2. Clear tenant context after operations complete

### Using a Middleware

For comprehensive protection, implement a middleware that:

1. Gets the tenant ID from the authenticated user
2. Sets the tenant context at the beginning of each request
3. Clears the tenant context after the request completes

## Regular Maintenance

To ensure RLS continues working:

1. Add RLS checks to CI/CD pipelines
2. Implement automatic RLS policy creation for new tables 
3. Run periodic audits of RLS configuration 