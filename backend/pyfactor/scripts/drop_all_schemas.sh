#!/bin/bash
# Script to drop all tenant schemas directly using psql

# Get database connection details from Django settings
DB_NAME=$(python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings'); import django; django.setup(); from django.conf import settings; print(settings.DATABASES['default']['NAME'])")
DB_USER=$(python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings'); import django; django.setup(); from django.conf import settings; print(settings.DATABASES['default']['USER'])")
DB_PASSWORD=$(python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings'); import django; django.setup(); from django.conf import settings; print(settings.DATABASES['default']['PASSWORD'])")
DB_HOST=$(python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings'); import django; django.setup(); from django.conf import settings; print(settings.DATABASES['default']['HOST'])")
DB_PORT=$(python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings'); import django; django.setup(); from django.conf import settings; print(settings.DATABASES['default']['PORT'])")

# Set PGPASSWORD environment variable for psql
export PGPASSWORD="$DB_PASSWORD"

echo "WARNING: This will permanently delete all tenant schemas!"
echo "Type 'DROP ALL SCHEMAS' to confirm:"
read confirmation

if [ "$confirmation" != "DROP ALL SCHEMAS" ]; then
    echo "Operation cancelled"
    exit 1
fi

echo "Dropping all tenant schemas..."

# Execute SQL to drop all tenant schemas
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
DO \$\$
DECLARE
    schema_rec RECORD;
BEGIN
    FOR schema_rec IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE 'DROP SCHEMA \"' || schema_rec.schema_name || '\" CASCADE';
        RAISE NOTICE 'Dropped schema: %', schema_rec.schema_name;
    END LOOP;
END \$\$;
"

# Check if any tenant schemas remain
remaining_schemas=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) 
FROM information_schema.schemata 
WHERE schema_name LIKE 'tenant_%'
")

if [ "$remaining_schemas" -gt 0 ]; then
    echo "There are still $remaining_schemas tenant schemas remaining"
    echo "Remaining schemas:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%'
    "
else
    echo "All tenant schemas have been successfully dropped"
fi

# Truncate tenant tables
echo "Truncating tenant tables..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "TRUNCATE TABLE auth_tenant CASCADE;"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "TRUNCATE TABLE users_user CASCADE;"

echo "Schema removal process completed"