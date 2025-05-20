-- SQL Script to safely remove anonymous tenant
-- Save this file and run it against your AWS RDS database

-- Start transaction for safety
BEGIN;

-- Step 1: Verify the tenant exists and get schema info
SELECT id, name, owner_id, schema_name 
FROM custom_auth_tenant 
WHERE owner_id LIKE 'anonymous_%' 
  OR id = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';

-- Step 2: Check for data that might need backup (uncomment and run separately if needed)
-- SELECT count(*) FROM tenant_18609ed2_1a46_4d50_bc4e_483d6e3405ff.inventory_product;

-- Step 3: Remove tenant record(s)
DELETE FROM custom_auth_tenant 
WHERE owner_id LIKE 'anonymous_%'
RETURNING id, name, owner_id, schema_name;

-- Step 4: Remove any user records associated with these tenants
DELETE FROM custom_auth_user 
WHERE tenant_id IN (
  SELECT id FROM custom_auth_tenant 
  WHERE owner_id LIKE 'anonymous_%'
);

-- Step 5: Drop the specific anonymous schema
DROP SCHEMA IF EXISTS tenant_18609ed2_1a46_4d50_bc4e_483d6e3405ff CASCADE;

-- Step 6: Find and drop any other anonymous schemas
DO $$
DECLARE
  schema_rec RECORD;
BEGIN
  FOR schema_rec IN 
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%' 
      AND schema_name NOT IN (
        SELECT schema_name 
        FROM custom_auth_tenant
      )
  LOOP
    EXECUTE 'DROP SCHEMA IF EXISTS ' || schema_rec.schema_name || ' CASCADE;';
    RAISE NOTICE 'Dropped schema: %', schema_rec.schema_name;
  END LOOP;
END $$;

-- Check results one more time before committing
SELECT id, name, owner_id, schema_name 
FROM custom_auth_tenant 
WHERE owner_id LIKE 'anonymous_%';

-- If everything looks good, uncomment the COMMIT line:
-- COMMIT;

-- If there are any issues, use ROLLBACK instead:
ROLLBACK; 