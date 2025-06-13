#!/bin/bash
# Final comprehensive migration fix script

echo "Final Migration Fix Script"
echo "========================="

# Activate virtual environment
source venv/bin/activate

echo -e "\n1. Checking current migration status..."
python manage.py showmigrations --plan | grep "\[ \]" | head -20

echo -e "\n2. Migrating apps in dependency order..."

# First ensure inventory tables exist (purchases depends on it)
echo -e "\n   → Migrating inventory..."
python manage.py migrate inventory --no-input 2>&1 | tail -5

# Then purchases (finance depends on it)
echo -e "\n   → Migrating purchases..."
python manage.py migrate purchases --no-input 2>&1 | tail -5

# Then users (already partially done)
echo -e "\n   → Faking users 0001_initial (table exists)..."
python manage.py migrate users 0001_initial --fake --no-input 2>&1 | tail -5

echo -e "\n   → Continuing users migrations..."
python manage.py migrate users --no-input 2>&1 | tail -5

# Then finance
echo -e "\n   → Migrating finance..."
python manage.py migrate finance --no-input 2>&1 | tail -5

# Then sales
echo -e "\n   → Migrating sales..."
python manage.py migrate sales --no-input 2>&1 | tail -5

# Then payroll
echo -e "\n   → Migrating payroll..."
python manage.py migrate payroll --no-input 2>&1 | tail -5

# Then other apps
for app in integrations onboarding payments reports analysis; do
    echo -e "\n   → Migrating $app..."
    python manage.py migrate $app --no-input 2>&1 | tail -5
done

echo -e "\n3. Final verification..."
python -c "
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()
from django.db import connection

with connection.cursor() as cursor:
    cursor.execute('''
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND (
            table_name LIKE 'users_%' OR
            table_name LIKE 'hr_%' OR
            table_name LIKE 'sales_%' OR
            table_name LIKE 'finance_%' OR
            table_name LIKE 'payroll_%' OR
            table_name LIKE 'inventory_%'
        )
        ORDER BY table_name
    ''')
    tables = cursor.fetchall()
    
    print('\\nCreated tables:')
    apps = {}
    for table in tables:
        app = table[0].split('_')[0]
        if app not in apps:
            apps[app] = []
        apps[app].append(table[0])
    
    for app, app_tables in sorted(apps.items()):
        print(f'\\n{app}: {len(app_tables)} tables')
        for table in app_tables[:3]:
            print(f'  - {table}')
        if len(app_tables) > 3:
            print(f'  ... and {len(app_tables) - 3} more')
"

echo -e "\n4. Showing final migration status..."
python manage.py showmigrations --list | grep -E "(finance|sales|payroll|users|purchases)" | head -50

echo -e "\n✅ Migration fix complete!"