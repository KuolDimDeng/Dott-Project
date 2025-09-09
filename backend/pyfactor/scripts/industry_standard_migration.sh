#!/bin/bash
# Industry-standard migration approach
# This script ensures migrations are applied properly on deployment

# Don't exit on error immediately - we need to handle migration conflicts
set +e

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

# Step 2: Fix transport migration conflicts comprehensively
echo ""
echo "2. Fixing transport migration conflicts..."
python scripts/pre_migration_fix.py || echo "Migration fix attempted"

# Step 2a: Fix courier migration state
echo ""
echo "2a. Fixing courier migration state..."
python scripts/fix_courier_migrations.py || echo "Courier migration fix attempted"

# Step 2b: Skip makemigrations in production - all migrations should be committed
echo ""
echo "2b. Skipping makemigrations (production environment)..."

# Now set exit on error for the actual migrations
set -e

# Step 3: Show pending migrations
echo ""
echo "3. Checking pending migrations..."
python manage.py showmigrations --plan | grep "\[ \]" || echo "✅ No pending migrations"

# Step 4: Apply migrations (fail if error)
echo ""
echo "4. Applying migrations..."
python manage.py migrate --noinput --verbosity 2 || {
    echo "Migration failed with error code $?"
    echo "Attempting to show migration status..."
    python manage.py showmigrations || true
    exit 1
}

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