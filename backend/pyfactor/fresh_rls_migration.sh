#!/bin/bash

# Script to completely migrate from tenant schemas to row-level security (RLS)
# This script does NOT migrate existing data, but sets up a clean RLS configuration

set -e
echo "PyFactor Clean RLS Migration"
echo "============================"
echo "This script will migrate your database from tenant schemas to row-level security."
echo "⚠️  WARNING: This migration will NOT preserve existing tenant data! ⚠️"
echo ""
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 1
fi

# Get database connection parameters
echo "Please provide your database connection details:"
read -p "Database name [dott_main]: " dbname
dbname=${dbname:-dott_main}
read -p "Database user [dott_admin]: " dbuser
dbuser=${dbuser:-dott_admin}
read -p "Database password: " dbpass
read -p "Database host [localhost]: " dbhost
dbhost=${dbhost:-localhost}
read -p "Database port [5432]: " dbport
dbport=${dbport:-5432}

echo "Exporting DB connection parameters"
export PGHOST=$dbhost
export PGPORT=$dbport
export PGUSER=$dbuser
export PGPASSWORD=$dbpass
export PGDATABASE=$dbname

# 1. Setup RLS in database
echo "1. Setting up RLS in database..."
cat <<EOT > setup_rls.sql
-- Create UUID extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set up database parameter for tenant context
ALTER DATABASE current_database() SET "app.current_tenant_id" = 'unset';

-- Create RLS function for setting tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS void AS \$\$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
\$\$ LANGUAGE plpgsql;
EOT

psql -f setup_rls.sql
echo "✅ RLS settings applied to database"

# 2. Get list of tenant schemas
echo "2. Getting list of tenant schemas..."
psql -t -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';" > tenant_schemas.txt
echo "Found $(wc -l < tenant_schemas.txt | tr -d ' ') tenant schemas"

# 3. Store tenant IDs from schemas (if needed for future reference)
echo "3. Storing tenant IDs from schemas..."
touch tenant_ids.txt
while read schema; do
    # Extract tenant ID from schema name by removing 'tenant_' prefix and replacing _ with -
    tenant_id=$(echo $schema | sed 's/tenant_//' | sed 's/_/-/g')
    echo "$schema -> $tenant_id" >> tenant_ids.txt
done < tenant_schemas.txt
echo "✅ Tenant IDs stored in tenant_ids.txt"

# 4. Update Tenant model - remove schema_name field
echo "4. Updating Tenant model and adding RLS fields..."
cat <<EOT > update_tenant_model.sql
-- Add RLS fields to Tenant model if they don't exist
ALTER TABLE custom_auth_tenant ADD COLUMN IF NOT EXISTS rls_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE custom_auth_tenant ADD COLUMN IF NOT EXISTS rls_setup_date TIMESTAMP WITH TIME ZONE;

-- Drop schema_name column if it exists
ALTER TABLE custom_auth_tenant DROP COLUMN IF EXISTS schema_name;

-- Update all tenants to use RLS
UPDATE custom_auth_tenant SET rls_enabled = TRUE, rls_setup_date = NOW();
EOT

psql -f update_tenant_model.sql
echo "✅ Tenant model updated"

# 5. Add tenant_id column to relevant tables
echo "5. Adding tenant_id column to tables..."
psql -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" > tables.txt

cat <<EOT > add_tenant_id.sql
-- Add tenant_id column to tables
EOT

cat <<EOT > create_rls_policies.sql
-- Create RLS policies
EOT

while read table; do
    # Skip system and internal tables
    if [[ $table == pg_* || $table == _* || $table == django_* || $table == auth_* || $table == custom_auth_* ]]; then
        continue
    fi
    
    table=$(echo $table | tr -d ' ')
    if [ -z "$table" ]; then
        continue
    fi
    
    # Add tenant_id column
    echo "ALTER TABLE $table ADD COLUMN IF NOT EXISTS tenant_id UUID;" >> add_tenant_id.sql
    
    # Create RLS policy using NULLIF for proper filtering
    echo "ALTER TABLE $table ENABLE ROW LEVEL SECURITY;" >> create_rls_policies.sql
    echo "DROP POLICY IF EXISTS tenant_isolation_policy ON $table;" >> create_rls_policies.sql
    echo "CREATE POLICY tenant_isolation_policy ON $table AS RESTRICTIVE USING ((tenant_id::TEXT = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset')) OR current_setting('app.current_tenant_id', TRUE) = 'unset');" >> create_rls_policies.sql
done < tables.txt

echo "Adding tenant_id columns..."
psql -f add_tenant_id.sql

echo "Creating RLS policies..."
psql -f create_rls_policies.sql

echo "✅ Added tenant_id columns and RLS policies to tables"

# 6. Create test table to verify RLS is working
echo "6. Creating test table to verify RLS..."
cat <<EOT > create_test_table.sql
-- Create test table with RLS
DROP TABLE IF EXISTS rls_test;

CREATE TABLE rls_test (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE rls_test ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test;
CREATE POLICY tenant_isolation_policy ON rls_test
AS RESTRICTIVE
USING (
    (tenant_id::TEXT = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset'))
    OR current_setting('app.current_tenant_id', TRUE) = 'unset'
);

-- Insert test data
INSERT INTO rls_test (tenant_id, name)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Tenant 1 - Record 1'),
    ('11111111-1111-1111-1111-111111111111', 'Tenant 1 - Record 2'),
    ('22222222-2222-2222-2222-222222222222', 'Tenant 2 - Record 1'),
    ('22222222-2222-2222-2222-222222222222', 'Tenant 2 - Record 2');

-- Test the RLS functionality
\echo 'Testing with tenant_id = unset (should see all records)'
SELECT set_config('app.current_tenant_id', 'unset', FALSE);
SELECT id, tenant_id, name FROM rls_test;

\echo 'Testing with tenant_id = 11111111-1111-1111-1111-111111111111'
SELECT set_config('app.current_tenant_id', '11111111-1111-1111-1111-111111111111', FALSE);
SELECT id, tenant_id, name FROM rls_test;

\echo 'Testing with tenant_id = 22222222-2222-2222-2222-222222222222'
SELECT set_config('app.current_tenant_id', '22222222-2222-2222-2222-222222222222', FALSE);
SELECT id, tenant_id, name FROM rls_test;
EOT

echo "Creating and testing RLS test table..."
psql -f create_test_table.sql

# 7. Drop tenant schemas if requested
echo "7. Cleaning up tenant schemas..."
read -p "Do you want to drop all tenant schemas? (y/n) " -n 1 -r drop_schemas
echo ""

if [[ $drop_schemas =~ ^[Yy]$ ]]; then
    echo "Creating schema drop script..."
    cat <<EOT > drop_schemas.sql
-- Drop tenant schemas
EOT
    
    while read schema; do
        schema=$(echo $schema | tr -d ' ')
        if [ -z "$schema" ]; then
            continue
        fi
        echo "DROP SCHEMA IF EXISTS $schema CASCADE;" >> drop_schemas.sql
    done < tenant_schemas.txt
    
    echo "Dropping schemas..."
    psql -f drop_schemas.sql
    echo "✅ Tenant schemas dropped"
else
    echo "Skipping schema drop"
fi

echo ""
echo "🎉 Migration complete!"
echo ""
echo "Your database is now using row-level security (RLS) for tenant isolation."
echo "To verify it's working correctly, run:"
echo ""
echo "  psql -h $dbhost -p $dbport -U $dbuser -d $dbname"
echo "  => SET app.current_tenant_id = '11111111-1111-1111-1111-111111111111';"
echo "  => SELECT * FROM rls_test;"
echo ""
echo "You should only see rows for the specified tenant."
echo "Make sure to set tenant_id column values appropriately for all your data." 