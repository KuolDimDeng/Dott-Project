-- SQL script to remove the duplicate "Juba Made It" tenant
BEGIN;

-- Tenant to keep
\set tenant_to_keep '7b09156a-c6e3-49e5-a9ff-f0aa0dea6007'

-- Tenant to remove
\set tenant_to_remove '70cc394b-6b7c-5e61-8213-9801cbc78708'
\set schema_to_remove 'tenant_70cc394b_6b7c_5e61_8213_9801cbc78708'

-- Verification step to ensure we're removing the correct tenant
SELECT id, name, owner_id, schema_name FROM custom_auth_tenant WHERE id = :'tenant_to_remove';

-- Remove any user associations with this tenant
UPDATE users_userprofile SET tenant_id = :'tenant_to_keep' 
WHERE tenant_id = :'tenant_to_remove';

UPDATE custom_auth_user SET tenant_id = :'tenant_to_keep' 
WHERE tenant_id = :'tenant_to_remove';

-- Drop the schema (this will remove all tables in the schema)
DROP SCHEMA IF EXISTS :"schema_to_remove" CASCADE;

-- Delete the tenant record
DELETE FROM custom_auth_tenant WHERE id = :'tenant_to_remove';

-- Verify the tenant was removed and only one remains
SELECT id, name, owner_id, schema_name FROM custom_auth_tenant;

COMMIT;
