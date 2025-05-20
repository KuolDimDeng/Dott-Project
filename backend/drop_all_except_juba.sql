-- Script to drop all tenant schemas except Juba Made It
BEGIN;

-- First, save the list of schemas to drop
CREATE TEMPORARY TABLE schemas_to_drop AS
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name LIKE 'tenant_%' 
AND schema_name != 'tenant_7b09156a_c6e3_49e5_a9ff_f0aa0dea6007';

-- Also create temporary table for tracking progress
CREATE TEMPORARY TABLE drop_results (
  schema_name text,
  result text
);

-- Create a function to drop each schema
DO $$
DECLARE
  schema_rec RECORD;
  drop_sql TEXT;
  result_text TEXT;
BEGIN
  FOR schema_rec IN (SELECT schema_name FROM schemas_to_drop) LOOP
    BEGIN
      drop_sql := 'DROP SCHEMA IF EXISTS ' || schema_rec.schema_name || ' CASCADE;';
      EXECUTE drop_sql;
      result_text := 'Successfully dropped';
      EXCEPTION WHEN OTHERS THEN
        result_text := 'Error: ' || SQLERRM;
    END;
    
    -- Record the result
    INSERT INTO drop_results VALUES (schema_rec.schema_name, result_text);
  END LOOP;
END;
$$;

-- Show the results
SELECT * FROM drop_results;

-- Also remove any tenant records for deleted schemas
DELETE FROM custom_auth_tenant 
WHERE schema_name != 'tenant_7b09156a_c6e3_49e5_a9ff_f0aa0dea6007';

-- Verify that only the desired tenant record remains
SELECT id, name, schema_name FROM custom_auth_tenant;

-- Verify that only the desired schema remains
SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';

COMMIT; 