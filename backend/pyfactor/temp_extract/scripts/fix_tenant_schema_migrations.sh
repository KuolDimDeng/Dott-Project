#!/bin/bash
# Script to fix tenant schema migrations by resolving migration dependencies and running migrations

set -e

# Change to the project directory
cd "$(dirname "$0")/.."

echo "Step 1: Fixing migration dependencies..."
python scripts/fix_migration_dependencies.py

echo "Step 2: Running migrations for the public schema..."
python manage.py migrate

echo "Step 3: Checking tenant schemas..."
python scripts/check_tenant_migrations.py

echo "Step 4: Fixing tenant schemas with issues..."
python scripts/monitor_tenant_schemas.py --fix

echo "Step 5: Testing tenant migrations..."
python scripts/test_tenant_migrations.py

echo "Done! Tenant schema migrations should now be working correctly."
