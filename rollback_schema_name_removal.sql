-- ROLLBACK SCRIPT: Restore schema_name column from backup
-- Only run this in case of emergency

BEGIN;

-- Add schema_name column back
ALTER TABLE custom_auth_tenant ADD COLUMN schema_name VARCHAR(255);

-- Restore data from backup
UPDATE custom_auth_tenant t
SET schema_name = b.schema_name
FROM custom_auth_tenant_backup b
WHERE t.id = b.id;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully restored schema_name column';
END $$;

COMMIT;
