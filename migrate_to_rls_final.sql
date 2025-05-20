-- RLS Migration: Complete transition to Row-Level Security and away from schema-per-tenant approach
-- This script migrates the database to use only RLS for tenant isolation

-- 1. Create uuid-ossp extension if it doesn't exist
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating uuid-ossp extension: %', SQLERRM;
END$$;

-- 2. Set up app.current_tenant_id database parameter if not already set
DO $$
BEGIN
  EXECUTE 'ALTER DATABASE CURRENT_DATABASE() SET app.current_tenant_id = ''unset''';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error setting app.current_tenant_id parameter: %', SQLERRM;
END$$;

-- 3. Create tenant_id related functions
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  -- If tenant ID is not set, return NULL
  IF current_setting('app.current_tenant_id', TRUE) IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Try to convert the tenant ID string to UUID
  BEGIN
    RETURN current_setting('app.current_tenant_id', TRUE)::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id_param UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id_param::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', NULL, FALSE);
END;
$$ LANGUAGE plpgsql;

-- 4. Add tenant_id column to tables and enable RLS
DO $$
DECLARE
  table_record RECORD;
  v_error TEXT;
  v_sql TEXT;
BEGIN
  -- Loop through all tables in the public schema
  FOR table_record IN 
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN ('auth_user', 'django_migrations', 'django_content_type', 'auth_permission')
  LOOP
    BEGIN
      -- Check if tenant_id column exists
      PERFORM column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = table_record.table_name
        AND column_name = 'tenant_id';
        
      IF NOT FOUND THEN
        -- Add tenant_id column if it doesn't exist
        v_sql := format('ALTER TABLE %I ADD COLUMN tenant_id UUID NULL', table_record.table_name);
        EXECUTE v_sql;
        RAISE NOTICE 'Added tenant_id column to %', table_record.table_name;
      ELSE
        RAISE NOTICE 'tenant_id column already exists in %', table_record.table_name;
      END IF;
      
      -- Enable RLS
      v_sql := format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.table_name);
      EXECUTE v_sql;
      
      -- Create RLS policy if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = table_record.table_name 
        AND policyname = 'tenant_isolation_policy'
      ) THEN
        v_sql := format('CREATE POLICY tenant_isolation_policy ON %I 
                        USING (tenant_id = get_current_tenant_id() OR tenant_id IS NULL)
                        WITH CHECK (tenant_id = get_current_tenant_id())', 
                      table_record.table_name);
        EXECUTE v_sql;
        RAISE NOTICE 'Created RLS policy for %', table_record.table_name;
      ELSE
        RAISE NOTICE 'RLS policy already exists for %', table_record.table_name;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_error := SQLERRM;
      RAISE NOTICE 'Error processing table %: %', table_record.table_name, v_error;
    END;
  END LOOP;
END$$;

-- 5. Update tenant table to mark all tenants as using RLS
DO $$
DECLARE
    v_count INTEGER;
    has_setup_date BOOLEAN;
BEGIN
    -- Check if rls_enabled column exists
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'custom_auth_tenant' AND column_name = 'rls_enabled'
    ) THEN
        -- Check if rls_setup_date column exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'custom_auth_tenant' AND column_name = 'rls_setup_date'
        ) INTO has_setup_date;
        
        -- Update all tenants to use RLS, handling both cases
        IF has_setup_date THEN
            UPDATE custom_auth_tenant
            SET rls_enabled = TRUE,
                rls_setup_date = COALESCE(rls_setup_date, NOW())
            WHERE rls_enabled IS NULL OR rls_enabled = FALSE;
        ELSE
            UPDATE custom_auth_tenant
            SET rls_enabled = TRUE
            WHERE rls_enabled IS NULL OR rls_enabled = FALSE;
        END IF;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Updated % tenants to use RLS', v_count;
    ELSE
        RAISE NOTICE 'Column rls_enabled does not exist in custom_auth_tenant table';
    END IF;
END$$;

-- 6. Mark schema_name as deprecated since we're using RLS now
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'custom_auth_tenant' AND column_name = 'schema_name'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN custom_auth_tenant.schema_name IS ''Deprecated: Only used for schema-per-tenant approach. RLS is now the preferred isolation method.''';
    
    -- Make schema_name nullable for new tenants
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'custom_auth_tenant'
        AND column_name = 'schema_name'
        AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE custom_auth_tenant ALTER COLUMN schema_name DROP NOT NULL;
    END IF;
  END IF;
END$$;

-- 7. Create a view to help track which tables need RLS
CREATE OR REPLACE VIEW rls_status AS
SELECT
    tables.table_name,
    CASE WHEN policies.tablename IS NOT NULL THEN TRUE ELSE FALSE END AS has_rls_policy,
    CASE WHEN columns.column_name IS NOT NULL THEN TRUE ELSE FALSE END AS has_tenant_id,
    t.relrowsecurity AS rls_enabled
FROM 
    information_schema.tables tables
LEFT JOIN 
    pg_policies policies ON policies.tablename = tables.table_name AND policies.policyname = 'tenant_isolation_policy'
LEFT JOIN 
    information_schema.columns columns ON columns.table_name = tables.table_name AND columns.column_name = 'tenant_id'
JOIN 
    pg_class t ON t.relname = tables.table_name
WHERE 
    tables.table_schema = 'public' AND 
    tables.table_type = 'BASE TABLE' AND
    tables.table_name NOT IN ('auth_user', 'django_migrations', 'django_content_type', 'auth_permission');

-- 8. Function to test RLS for a specific table
CREATE OR REPLACE FUNCTION test_rls_for_table(table_name TEXT)
RETURNS TABLE(tenant_id UUID, record_count BIGINT) AS $$
DECLARE
    sql_query TEXT;
    tenant_record RECORD;
BEGIN
    -- Test if table has tenant_id column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = table_name AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION 'Table % does not have a tenant_id column', table_name;
    END IF;
    
    -- Get all tenant IDs
    FOR tenant_record IN 
        SELECT id FROM custom_auth_tenant 
        WHERE is_active = TRUE
    LOOP
        -- Set tenant context
        PERFORM set_tenant_context(tenant_record.id);
        
        -- Count records for this tenant
        sql_query := format('SELECT %L::UUID as tenant_id, COUNT(*) as record_count FROM %I', 
                          tenant_record.id, table_name);
        RETURN QUERY EXECUTE sql_query;
    END LOOP;
    
    -- Clear tenant context when done
    PERFORM clear_tenant_context();
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM test_rls_for_table('inventory_product'); 