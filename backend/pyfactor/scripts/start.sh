#!/bin/bash
# Render start script that ensures migrations are run

echo "=== Pre-start: Running Django migrations ==="
python manage.py migrate --no-input

echo "=== Pre-start: Applying currency fields migration ==="
python scripts/apply_currency_migration.py

echo "=== Pre-start: Applying tax jurisdiction migration ==="
python scripts/apply_tax_migration.py

echo "=== Pre-start: Checking subscription_plan column ==="
python scripts/check_subscription_column.py

echo "=== Pre-start: Ensuring tenant_id column exists ==="
python scripts/ensure_tenant_id_column.py

echo "=== Pre-start: Marking tenant_id migration as applied ==="
python scripts/mark_employee_tenant_migration_applied.py

echo "=== Pre-start: Populating developing countries table ==="
python manage.py populate_developing_countries

echo "=== Starting Gunicorn ==="
exec gunicorn --bind 0.0.0.0:$PORT pyfactor.wsgi:application