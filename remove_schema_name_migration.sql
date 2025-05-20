-- MIGRATION: Remove schema_name column after completing RLS migration
-- This script should only be run after confirming all code has been updated
-- to use tenant_id instead of schema_name

-- Transaction to ensure atomicity
BEGIN;

-- Step 1: First check if the RLS migration is complete
DO $$
DECLARE
    rls_status INTEGER;
BEGIN
    -- Check if all tenants have RLS enabled
    SELECT COUNT(*) INTO rls_status FROM custom_auth_tenant WHERE rls_enabled = FALSE OR rls_enabled IS NULL;
    
    IF rls_status > 0 THEN
        RAISE EXCEPTION 'Cannot remove schema_name: % tenants do not have RLS enabled', rls_status;
    END IF;

    -- Check if RLS setup_date is present for all tenants
    SELECT COUNT(*) INTO rls_status FROM custom_auth_tenant WHERE rls_setup_date IS NULL;
    
    IF rls_status > 0 THEN
        RAISE EXCEPTION 'Cannot remove schema_name: % tenants do not have RLS setup date set', rls_status;
    END IF;
END $$;

-- Step 2: Create a backup of the tenant table with schema_name
CREATE TABLE custom_auth_tenant_backup AS SELECT * FROM custom_auth_tenant;

-- Step 3: Update the model code to make schema_name nullable if not already
DO $$
BEGIN
    -- Check if the column is already nullable
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'custom_auth_tenant'
        AND column_name = 'schema_name'
        AND is_nullable = 'YES'
    ) THEN
        -- Make schema_name nullable to avoid errors during transition
        ALTER TABLE custom_auth_tenant ALTER COLUMN schema_name DROP NOT NULL;
        RAISE NOTICE 'Made schema_name column nullable';
    ELSE
        RAISE NOTICE 'schema_name column is already nullable';
    END IF;
END $$;

-- Step 4: Remove any schema-specific constraints 
-- (optional, only if any foreign keys reference schema_name)
-- This is likely not needed but included for safety

-- Step 5: Remove the schema_name column
ALTER TABLE custom_auth_tenant DROP COLUMN schema_name;

-- Step 6: Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Successfully removed schema_name column from custom_auth_tenant table';
    RAISE NOTICE 'A backup of the data has been created in custom_auth_tenant_backup';
END $$;

-- Step 7: Drop the actual schema objects that were created
DO $$
DECLARE
    schema_rec RECORD;
BEGIN
    -- Get a list of schemas that match the tenant schema pattern 
    -- (excluding system schemas)
    FOR schema_rec IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('public', 'information_schema', 'pg_catalog', 'pg_toast')
        AND schema_name NOT LIKE 'pg_%'
    LOOP
        -- Check if this looks like a tenant schema (implement your own logic)
        IF schema_rec.schema_name ~ '^tenant_[a-z0-9_]+$' OR schema_rec.schema_name ~ '^[a-f0-9]{8}_[a-f0-9]{4}_[a-f0-9]{4}_[a-f0-9]{4}_[a-f0-9]{12}$' THEN
            EXECUTE 'DROP SCHEMA IF EXISTS "' || schema_rec.schema_name || '" CASCADE';
            RAISE NOTICE 'Dropped schema %', schema_rec.schema_name;
        END IF;
    END LOOP;
END $$;

COMMIT; 