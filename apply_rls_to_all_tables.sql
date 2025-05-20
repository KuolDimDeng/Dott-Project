-- Script to apply RLS to all tables in the database

-- Function to apply RLS to a table
CREATE OR REPLACE FUNCTION apply_rls_to_table(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- Add tenant_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = $1 
      AND column_name = 'tenant_id'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN tenant_id UUID NULL', $1);
    RAISE NOTICE 'Added tenant_id column to table %', $1;
  END IF;
  
  -- Enable RLS on the table if not already enabled
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', $1);
  RAISE NOTICE 'Enabled RLS on table %', $1;
  
  -- Create RLS policy if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = $1 
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    EXECUTE format('CREATE POLICY tenant_isolation_policy ON %I
                   USING (tenant_id = get_current_tenant_id() OR tenant_id IS NULL)
                   WITH CHECK (tenant_id = get_current_tenant_id())', $1);
    RAISE NOTICE 'Created RLS policy for table %', $1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply RLS to all tables
DO $$
DECLARE
  table_record RECORD;
  excluded_tables TEXT[] := ARRAY[
    'django_migrations', 
    'django_content_type', 
    'auth_permission',
    'django_admin_log',
    'django_session'
  ];
BEGIN
  FOR table_record IN 
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN (SELECT unnest(excluded_tables))
  LOOP
    BEGIN
      PERFORM apply_rls_to_table(table_record.table_name);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error applying RLS to table %: %', table_record.table_name, SQLERRM;
    END;
  END LOOP;
END$$;

-- Create a view to show tables missing RLS
CREATE OR REPLACE VIEW tables_missing_rls AS
SELECT 
  tables.table_name,
  EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = tables.table_name
      AND column_name = 'tenant_id'
  ) AS has_tenant_id,
  t.relrowsecurity AS has_rls_enabled,
  EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = tables.table_name
      AND policyname = 'tenant_isolation_policy'
  ) AS has_rls_policy
FROM 
  information_schema.tables tables
JOIN 
  pg_class t ON t.relname = tables.table_name
WHERE 
  tables.table_schema = 'public'
  AND tables.table_type = 'BASE TABLE'
  AND tables.table_name NOT IN (
    'django_migrations', 
    'django_content_type', 
    'auth_permission',
    'django_admin_log',
    'django_session'
  )
  AND (
    NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tables.table_name
        AND column_name = 'tenant_id'
    )
    OR NOT t.relrowsecurity
    OR NOT EXISTS (
      SELECT FROM pg_policies
      WHERE tablename = tables.table_name
        AND policyname = 'tenant_isolation_policy'
    )
  );

-- List tables that are missing RLS configuration
SELECT * FROM tables_missing_rls; 