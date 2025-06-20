-- First, check what tables exist
\dt

-- If you see the tables, here's the correct cleanup script:
BEGIN; 
DO $$ 
DECLARE 
    s TEXT; 
BEGIN 
    FOR s IN SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' 
    LOOP 
        EXECUTE 'DROP SCHEMA ' || quote_ident(s) || ' CASCADE'; 
    END LOOP; 
END $$; 

-- Clean tables (using correct Django naming convention)
TRUNCATE 
    auth_user,
    accounts_tenant,
    accounts_tenantusermembership,
    django_session
CASCADE;

COMMIT; 

-- Verify cleanup
SELECT 'Cleanup complete. Users remaining:' as status, COUNT(*) FROM auth_user;