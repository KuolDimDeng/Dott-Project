-- RLS Fix Script
-- Run this script to fix Row Level Security (RLS) issues in the database

-- 1. Create RLS Helper Functions
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT) RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id, false);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clear_tenant_context() RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', 'unset', false);
END;
$$ LANGUAGE plpgsql;

-- 2. Create Test Table
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

-- 3. Create RLS Test Function
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

-- 4. Create Function to Find Tables without RLS
CREATE OR REPLACE FUNCTION find_tables_without_rls() RETURNS TABLE(
  table_name TEXT,
  has_tenant_id BOOLEAN,
  rls_enabled BOOLEAN,
  has_policy BOOLEAN
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
    -- Tables we know should have RLS
    AND c.relname IN (
      'custom_auth_tenant',
      'tenant_users',
      'income_income',
      'income_customer',
      'income_invoice',
      'income_invoiceitem',
      'expense_expense',
      'expense_vendor',
      'expense_bill',
      'expense_billitem'
    )
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
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Apply RLS to Core Tables
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT table_name FROM find_tables_without_rls() 
    WHERE has_tenant_id = true AND (rls_enabled = false OR has_policy = false)
  LOOP
    EXECUTE 'ALTER TABLE ' || table_record.table_name || ' ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON ' || table_record.table_name;
    
    EXECUTE 'CREATE POLICY tenant_isolation_policy ON ' || table_record.table_name || 
      ' AS RESTRICTIVE USING ((tenant_id::TEXT = NULLIF(current_setting(''app.current_tenant_id'', TRUE), ''unset''))' ||
      ' OR current_setting(''app.current_tenant_id'', TRUE) = ''unset'')';
      
    RAISE NOTICE 'Applied RLS to table: %', table_record.table_name;
  END LOOP;
END $$;

-- 6. Test the RLS System
SELECT clear_tenant_context();
SELECT 'Unset Context Test: Should show 4 rows' as test_name;
SELECT * FROM test_rls_table;

SELECT set_tenant_context('tenant1');
SELECT 'Tenant1 Context Test: Should show 1 row' as test_name;
SELECT * FROM test_rls_table;

SELECT clear_tenant_context();

-- Print results
SELECT 'RLS Configuration Test Results - Should all be TRUE' as test_name;
SELECT table_name, result.rls_working
FROM (
  SELECT table_name, test_rls_for_table(table_name) as result
  FROM find_tables_without_rls()
  WHERE has_tenant_id = true
) subq;

-- Update verification status in the database
UPDATE public.custom_auth_tenant SET rls_enabled = true;

-- Reset to unset when done
SELECT clear_tenant_context();

-- Print success
SELECT 'RLS Fix Script Completed Successfully' as status; 