-- Script to fix RLS migration issues
-- This script ensures all necessary columns exist and fixes any RLS issues

-- 1. Add the rls_setup_date column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'custom_auth_tenant' AND column_name = 'rls_setup_date'
    ) THEN
        ALTER TABLE custom_auth_tenant 
        ADD COLUMN rls_setup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added rls_setup_date column to custom_auth_tenant table';
    ELSE
        RAISE NOTICE 'rls_setup_date column already exists';
    END IF;
END$$;

-- 2. Make sure the tenant_id column exists in the tenant table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'custom_auth_tenant' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE custom_auth_tenant 
        ADD COLUMN tenant_id UUID;
        
        -- Set each tenant's tenant_id to its own id
        UPDATE custom_auth_tenant SET tenant_id = id;
        RAISE NOTICE 'Added tenant_id column to custom_auth_tenant table and populated it';
    ELSE
        RAISE NOTICE 'tenant_id column already exists in custom_auth_tenant table';
    END IF;
END$$;

-- 3. Make sure schema_name is nullable
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'custom_auth_tenant' 
          AND column_name = 'schema_name'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE custom_auth_tenant 
        ALTER COLUMN schema_name DROP NOT NULL;
        RAISE NOTICE 'Made schema_name column nullable';
    ELSE
        RAISE NOTICE 'schema_name column is already nullable or doesn''t exist';
    END IF;
END$$;

-- 4. Make sure the rls_enabled column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'custom_auth_tenant' AND column_name = 'rls_enabled'
    ) THEN
        ALTER TABLE custom_auth_tenant 
        ADD COLUMN rls_enabled BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added rls_enabled column to custom_auth_tenant table';
    ELSE
        RAISE NOTICE 'rls_enabled column already exists';
    END IF;
END$$;

-- 5. Update all tenants to use RLS
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE custom_auth_tenant
    SET rls_enabled = TRUE,
        rls_setup_date = NOW()
    WHERE rls_enabled IS NULL OR rls_enabled = FALSE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Updated % tenants to use RLS', v_count;
END$$;

-- 6. Add a comment to schema_name to indicate it's deprecated
DO $$
BEGIN
    EXECUTE 'COMMENT ON COLUMN custom_auth_tenant.schema_name IS ''Deprecated: Only used for schema-per-tenant approach. RLS is now the preferred isolation method.''';
    RAISE NOTICE 'Added deprecation comment to schema_name column';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add comment: %', SQLERRM;
END$$;

-- 7. Make sure RLS is enabled on the tenant table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE tablename = 'custom_auth_tenant' AND rowsecurity = true
    ) THEN
        ALTER TABLE custom_auth_tenant ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on custom_auth_tenant table';
    ELSE
        RAISE NOTICE 'RLS is already enabled on custom_auth_tenant table';
    END IF;
END$$;

-- 8. Make sure RLS policy exists for the tenant table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies
        WHERE tablename = 'custom_auth_tenant' AND policyname = 'tenant_isolation_policy'
    ) THEN
        EXECUTE 'CREATE POLICY tenant_isolation_policy ON custom_auth_tenant
                USING (tenant_id = get_current_tenant_id() OR tenant_id IS NULL OR id = get_current_tenant_id())
                WITH CHECK (tenant_id = get_current_tenant_id() OR id = get_current_tenant_id())';
        RAISE NOTICE 'Created RLS policy for custom_auth_tenant table';
    ELSE
        RAISE NOTICE 'RLS policy already exists for custom_auth_tenant table';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating RLS policy: %', SQLERRM;
END$$; 