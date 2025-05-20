-- Add the missing schema_name column
ALTER TABLE custom_auth_tenant ADD COLUMN schema_name VARCHAR(100);

-- Update existing tenants to have a schema_name based on their ID
-- This creates schema names in the format: tenant_XXXX where XXXX is the UUID with dashes replaced by underscores
UPDATE custom_auth_tenant 
SET schema_name = 'tenant_' || REPLACE(id::text, '-', '_')
WHERE schema_name IS NULL;

-- Verify the changes
SELECT id, name, schema_name FROM custom_auth_tenant; 