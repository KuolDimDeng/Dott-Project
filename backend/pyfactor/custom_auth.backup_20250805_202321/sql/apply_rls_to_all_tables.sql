-- PostgreSQL Script to apply Row Level Security (RLS) to all tenant-aware tables
-- This script finds all tables with a tenant_id column and applies RLS policies to them

-- Set up RLS global parameters
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
ALTER DATABASE current_database() SET "app.current_tenant_id" = 'unset';

-- Create function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql;

-- Create RLS function that determines if a row is visible based on tenant context
CREATE OR REPLACE FUNCTION tenant_isolation_filter()
RETURNS boolean AS $$
BEGIN
    RETURN (
        (current_setting('app.current_tenant_id', TRUE) = 'unset') OR
        (tenant_id::text = current_setting('app.current_tenant_id', TRUE))
    );
END;
$$ LANGUAGE plpgsql;

-- Create a function to apply RLS to a table
CREATE OR REPLACE FUNCTION apply_rls_to_table(table_name text, schema_name text DEFAULT 'public')
RETURNS void AS $$
DECLARE
    full_table_name text;
    has_tenant_id boolean;
BEGIN
    full_table_name := schema_name || '.' || table_name;
    
    -- Check if table has tenant_id column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = schema_name 
          AND table_name = table_name
          AND column_name = 'tenant_id'
    ) INTO has_tenant_id;
    
    IF has_tenant_id THEN
        -- Enable RLS on the table
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', full_table_name);
        
        -- Drop existing policy if it exists
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %s', full_table_name);
        
        -- Create RLS policy
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON %s 
             USING (tenant_id::text = current_setting(''app.current_tenant_id'', TRUE) 
                   OR current_setting(''app.current_tenant_id'', TRUE) = ''unset'')',
            full_table_name
        );
        
        RAISE NOTICE 'Applied RLS to table: %', full_table_name;
    ELSE
        RAISE NOTICE 'Skipping table (no tenant_id column): %', full_table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to apply RLS to all tables in a schema
CREATE OR REPLACE FUNCTION apply_rls_to_all_tables(schema_name text DEFAULT 'public')
RETURNS void AS $$
DECLARE
    table_record record;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = schema_name 
          AND table_type = 'BASE TABLE'
          -- Skip system tables
          AND table_name NOT LIKE 'pg_%'
          AND table_name NOT LIKE 'sql_%'
    LOOP
        PERFORM apply_rls_to_table(table_record.table_name, schema_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Apply RLS to all tables in the public schema
SELECT apply_rls_to_all_tables();

-- Test helper function to verify RLS is working
CREATE OR REPLACE FUNCTION test_rls_for_tenant(test_tenant_id uuid)
RETURNS TABLE (
    table_name text,
    record_count bigint
) AS $$
DECLARE
    table_record record;
    sql_stmt text;
    rec_count bigint;
BEGIN
    -- Set tenant context to the test tenant
    PERFORM set_tenant_context(test_tenant_id);
    
    FOR table_record IN 
        SELECT t.table_name 
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
          AND c.column_name = 'tenant_id'
          -- Skip system tables
          AND t.table_name NOT LIKE 'pg_%'
          AND t.table_name NOT LIKE 'sql_%'
    LOOP
        sql_stmt := format('SELECT COUNT(*) FROM %s', 'public.' || table_record.table_name);
        EXECUTE sql_stmt INTO rec_count;
        
        table_name := table_record.table_name;
        record_count := rec_count;
        RETURN NEXT;
    END LOOP;
    
    -- Reset tenant context
    PERFORM set_tenant_context(NULL);
    RETURN;
END;
$$ LANGUAGE plpgsql; 