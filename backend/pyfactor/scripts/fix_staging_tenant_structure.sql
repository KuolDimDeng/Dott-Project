-- Fix staging database to match production structure
-- This script converts the custom_auth_tenant view to a proper table

-- Step 1: Drop the view and its rules
DROP VIEW IF EXISTS custom_auth_tenant CASCADE;

-- Step 2: Create the custom_auth_tenant table to match production
CREATE TABLE IF NOT EXISTS custom_auth_tenant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id VARCHAR(255),
    schema_name VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    rls_enabled BOOLEAN NOT NULL DEFAULT true,
    rls_setup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    is_recoverable BOOLEAN,
    setup_status VARCHAR(20),
    last_health_check TIMESTAMP WITH TIME ZONE
);

-- Step 3: Migrate data from users_business to custom_auth_tenant
INSERT INTO custom_auth_tenant (id, name, owner_id, schema_name, created_at, updated_at)
SELECT 
    id,
    name,
    owner_id::varchar(255),
    name as schema_name,  -- Using name as schema_name like the view did
    created_at,
    updated_at
FROM users_business
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create indexes to match production
CREATE UNIQUE INDEX IF NOT EXISTS custom_auth_tenant_schema_name_key 
ON custom_auth_tenant(schema_name);

-- Step 5: Update foreign key constraints to reference the new table
-- First, check if there are any tables referencing the old view
SELECT 
    tc.table_name, 
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND kcu.table_name = 'custom_auth_tenant';

-- Step 6: Update custom_auth_user to reference the tenant properly
-- Check if the user table has a tenant_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'custom_auth_user' 
AND column_name = 'tenant_id';

-- Step 7: Verify the new structure
\d+ custom_auth_tenant

-- Step 8: Mark relevant migrations as applied if needed
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('custom_auth', '0010_tenant_deactivated_at', NOW()),
    ('custom_auth', '0011_tenant_is_recoverable', NOW()),
    ('custom_auth', '0012_tenant_setup_status', NOW()),
    ('custom_auth', '0013_tenant_last_health_check', NOW())
ON CONFLICT (app, name) DO NOTHING;