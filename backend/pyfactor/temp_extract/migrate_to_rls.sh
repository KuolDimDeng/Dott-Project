#!/bin/bash

# Script to migrate from tenant schemas to row-level security

set -e
echo "PyFactor RLS Migration"
echo "======================="
echo "This script will migrate your database from tenant schemas to row-level security."
echo "This is a one-way migration and existing data will need to be manually migrated."
echo ""
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Migration cancelled."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo "Error: manage.py not found. Please run this script from the Django project root directory."
    exit 1
fi

echo "1. Activating virtual environment..."
if [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo "Virtual environment not found at .venv. Attempting to continue anyway..."
fi

echo "2. Making tables tenant-aware by adding tenant_id column..."
echo "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" > add_tenant_id.sql

# Add tenant_id column to tables that need to be tenant-aware
python -c "
import os
from django.core.management import execute_from_command_line
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
import django
django.setup()
from django.apps import apps

# Get all models that should have tenant_id
app_list = ['finance', 'inventory', 'sales', 'crm', 'hr', 'banking']
for app_label in app_list:
    app_models = apps.get_app_config(app_label).get_models()
    for model in app_models:
        table_name = model._meta.db_table
        print(f\"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS tenant_id UUID;\")
" >> add_tenant_id.sql

echo "Applying tenant_id column changes..."
python manage.py dbshell < add_tenant_id.sql

echo "3. Applying RLS migrations..."
python manage.py makemigrations custom_auth -n remove_schema_name

echo "4. Migrating database..."
python manage.py migrate

echo "5. Setting up RLS policies..."
python manage.py setup_rls_policies

echo "6. Making RLS health check script executable..."
chmod +x custom_auth/management/commands/rls_health_check.py
chmod +x custom_auth/management/commands/migrate_data_to_rls.py

echo "7. Testing RLS setup..."
python manage.py rls_health_check --verbose

echo "8. Migrating data from tenant schemas to RLS tables..."
read -p "Would you like to migrate data from tenant schemas to RLS tables? This might take a while. (y/n) " -n 1 -r data_migration
echo ""
if [[ $data_migration =~ ^[Yy]$ ]]
then
    echo "Starting data migration..."
    python manage.py migrate_data_to_rls 
else
    echo "Skipping data migration. You can run it later with:"
    echo "  python manage.py migrate_data_to_rls"
    echo "To do a dry run first:"
    echo "  python manage.py migrate_data_to_rls --dry-run"
fi

echo "9. Updating tenant records to use RLS..."
python -c "
import os
from django.core.management import execute_from_command_line
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
import django
django.setup()
from django.utils import timezone
from custom_auth.models import Tenant

# Update all tenants to use RLS
updated = Tenant.objects.filter(rls_enabled=False).update(
    rls_enabled=True,
    rls_setup_date=timezone.now()
)
print(f'Updated {updated} tenants to use RLS')
"

echo ""
echo "Migration complete!"
echo ""
echo "To test that RLS is working, run:"
echo "  python manage.py rls_health_check --tenant-id=<tenant-id>"
echo ""
echo "You can also verify in the database by running:"
echo "  SET app.current_tenant_id = '<tenant-id>';"
echo "  SELECT * FROM <table_name>;"
echo ""
echo "For each table with tenant_id, you should only see rows for that tenant."
echo ""
echo "Note: Data migration from tenant schemas to public schema with tenant_id must be done manually." 