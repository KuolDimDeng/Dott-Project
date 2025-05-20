-- SQL script to drop all tenant schemas
DO $$
DECLARE
    schema_rec RECORD;
BEGIN
    FOR schema_rec IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE 'DROP SCHEMA "' || schema_rec.schema_name || '" CASCADE';
        RAISE NOTICE 'Dropped schema: %', schema_rec.schema_name;
    END LOOP;
END $$;