#!/bin/bash

echo "Starting tenant table synchronization"

# Activate virtual environment
source ../../.venv/bin/activate

# Run migrations to apply schema changes
echo "Applying migrations..."
python manage.py migrate custom_auth tenant_schema_sync

# Synchronize tenant data
echo "Synchronizing tenant data..."
python manage.py sync_tenant_data

echo "Tenant table synchronization complete!"