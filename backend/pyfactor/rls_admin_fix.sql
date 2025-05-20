-- RLS Fix to be run by a superuser
-- Run this with psql -U postgres -h host -d dott_main -f rls_admin_fix.sql

-- First, set the user and database for debugging
\echo 'Current user and database:'
SELECT current_user, current_database();

-- Create the RLS parameter at database level
ALTER DATABASE dott_main SET app.current_tenant_id = 'unset';

-- Grant proper permissions to dott_admin
ALTER USER dott_admin NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION BYPASSRLS;

-- Reload configuration 
SELECT pg_reload_conf();

\echo 'RLS parameter fixed at database level' 