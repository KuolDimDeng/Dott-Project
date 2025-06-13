#!/bin/bash
# Complete the remaining migrations

echo "Completing Remaining Migrations"
echo "=============================="

source venv/bin/activate

# First migrate CRM (finance depends on it)
echo -e "\n1. Migrating CRM..."
python manage.py migrate crm --no-input

# Then migrate the remaining apps
echo -e "\n2. Migrating remaining apps..."
for app in users sales payroll reports taxes integrations payments transport; do
    echo -e "\n   → Migrating $app..."
    python manage.py migrate $app --no-input
done

# Final check
echo -e "\n3. Final verification..."
python -c "
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()
from django.db import connection

with connection.cursor() as cursor:
    # Count tables for key apps
    apps = ['sales', 'payroll', 'crm', 'reports', 'taxes', 'integrations', 'payments']
    
    print('\\nFinal table counts:')
    for app in apps:
        cursor.execute('''
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE %s
        ''', [f'{app}_%'])
        count = cursor.fetchone()[0]
        status = '✅' if count > 0 else '❌'
        print(f'{status} {app}: {count} tables')
"

echo -e "\n✅ Migration process complete!"