#!/bin/bash
# Industry-standard migration approach
# This script ensures migrations are applied properly on deployment

set -e  # Exit on error

echo "=== Django Migration Process ==="
echo "Time: $(date)"
echo ""

# Step 1: Check database connection
echo "1. Testing database connection..."
python -c "
import django
django.setup()
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute('SELECT 1')
    print('✅ Database connection successful')
"

# Step 2: Fix transport migrations if needed
echo ""
echo "2. Checking and fixing transport migrations..."
python scripts/fix_transport_migrations.py || echo "Transport migration fix not needed or already applied"

# Step 3: Show pending migrations
echo ""
echo "3. Checking pending migrations..."
python manage.py showmigrations --plan | grep "\[ \]" || echo "✅ No pending migrations"

# Step 4: Apply migrations (fail if error)
echo ""
echo "4. Applying migrations..."
python manage.py migrate --noinput --verbosity 2

# Step 5: Verify critical migrations
echo ""
echo "5. Verifying critical migrations..."
python -c "
import django
django.setup()
from django.db.migrations.recorder import MigrationRecorder
from django.db import connection

recorder = MigrationRecorder(connection)
applied = recorder.applied_migrations()

critical_migrations = [
    ('sales', '0012_add_currency_to_pos_transactions'),
]

for app, migration in critical_migrations:
    if (app, migration) in applied:
        print(f'✅ {app}.{migration} is applied')
    else:
        print(f'❌ {app}.{migration} is NOT applied')
        exit(1)
"

echo ""
echo "✅ All migrations successfully applied"