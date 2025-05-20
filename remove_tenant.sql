-- SQL script to remove unwanted tenant
-- 1. Begin transaction for safety
BEGIN;

-- Store tenant details for verification
\set tenant_to_remove '70cc394b-6b7c-5e61-8213-9801cbc78708'
\set schema_to_remove 'tenant_70cc394b_6b7c_5e61_8213_9801cbc78708'

-- Look for and remove any references to this tenant in other tables
DELETE FROM users_userprofile WHERE tenant_id = :'tenant_to_remove';

-- First, drop the schema if it exists
DROP SCHEMA IF EXISTS tenant_18609ed2_1a46_4d50_bc4e_483d6e3405ff CASCADE;

-- Then delete the tenant record from the custom_auth_tenant table
DELETE FROM custom_auth_tenant WHERE id = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';

-- Verify the tenant has been removed
SELECT * FROM custom_auth_tenant WHERE id = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';

-- List remaining tenants
SELECT id, name, schema_name FROM custom_auth_tenant;
