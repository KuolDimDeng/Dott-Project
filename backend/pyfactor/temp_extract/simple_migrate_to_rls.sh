#!/bin/bash

# Simple script to set up RLS without full migration

set -e

echo "Setting up RLS parameters in database..."
echo "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" > setup_rls.sql
echo "ALTER DATABASE current_database() SET \"app.current_tenant_id\" = 'unset';" >> setup_rls.sql

echo "Creating RLS function..."
cat <<EOT >> setup_rls.sql
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS void AS \$\$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
\$\$ LANGUAGE plpgsql;
EOT

echo "Creating RLS policy for test table..."
cat <<EOT >> setup_rls.sql
CREATE TABLE IF NOT EXISTS rls_test (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL
);

ALTER TABLE rls_test ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test;
CREATE POLICY tenant_isolation_policy ON rls_test
USING (
    tenant_id::text = current_setting('app.current_tenant_id', TRUE)
    OR current_setting('app.current_tenant_id', TRUE) = 'unset'
);

-- Insert test data
INSERT INTO rls_test (tenant_id, name) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Tenant 1 - Record 1'),
    ('11111111-1111-1111-1111-111111111111', 'Tenant 1 - Record 2'),
    ('22222222-2222-2222-2222-222222222222', 'Tenant 2 - Record 1'),
    ('22222222-2222-2222-2222-222222222222', 'Tenant 2 - Record 2');
EOT

echo "Testing RLS functionality..."
cat <<EOT >> setup_rls.sql
-- Test with tenant 1
SELECT set_config('app.current_tenant_id', '11111111-1111-1111-1111-111111111111', false);
SELECT * FROM rls_test;

-- Test with tenant 2
SELECT set_config('app.current_tenant_id', '22222222-2222-2222-2222-222222222222', false);
SELECT * FROM rls_test;

-- Test with no tenant (should see all records when 'unset')
SELECT set_config('app.current_tenant_id', 'unset', false);
SELECT * FROM rls_test;
EOT

echo "Ready to apply RLS setup. This will run SQL commands directly on your database."
echo "Please provide your database connection details:"
read -p "Database name [pyfactor]: " dbname
dbname=${dbname:-pyfactor}
read -p "Database user [postgres]: " dbuser
dbuser=${dbuser:-postgres}
read -p "Database host [localhost]: " dbhost
dbhost=${dbhost:-localhost}
read -p "Database port [5432]: " dbport
dbport=${dbport:-5432}

echo "Applying RLS setup to database $dbname..."
PGPASSWORD=${PGPASSWORD} psql -h $dbhost -p $dbport -U $dbuser -d $dbname -f setup_rls.sql

echo "RLS setup complete!"
echo "You can verify RLS is working by running:"
echo "  psql -h $dbhost -p $dbport -U $dbuser -d $dbname"
echo "  > SET app.current_tenant_id = '11111111-1111-1111-1111-111111111111';"
echo "  > SELECT * FROM rls_test;" 