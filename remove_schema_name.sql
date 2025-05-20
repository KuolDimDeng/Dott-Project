-- Remove the schema_name column from custom_auth_tenant table
-- This is no longer needed as the application has moved from MUI to Tailwind CSS

-- Check if the column exists first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'custom_auth_tenant'
    AND column_name = 'schema_name'
  ) THEN
    -- Remove the schema_name column
    ALTER TABLE custom_auth_tenant DROP COLUMN schema_name;
    
    RAISE NOTICE 'schema_name column has been removed from custom_auth_tenant table';
  ELSE
    RAISE NOTICE 'schema_name column does not exist in custom_auth_tenant table';
  END IF;
END $$;

-- Verify the column has been removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'custom_auth_tenant'
ORDER BY ordinal_position; 