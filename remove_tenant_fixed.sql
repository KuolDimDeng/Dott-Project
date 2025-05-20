-- SQL script to remove the duplicate tenant (simplified)
BEGIN;

-- Show the tenant to be removed
SELECT * FROM custom_auth_tenant WHERE id = '70cc394b-6b7c-5e61-8213-9801cbc78708';

-- Drop the schema directly
DROP SCHEMA IF EXISTS tenant_70cc394b_6b7c_5e61_8213_9801cbc78708 CASCADE;

-- Delete the tenant record
DELETE FROM custom_auth_tenant WHERE id = '70cc394b-6b7c-5e61-8213-9801cbc78708';

-- Verify that only one tenant remains
SELECT * FROM custom_auth_tenant;

COMMIT;
