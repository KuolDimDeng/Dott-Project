#!/bin/bash
# Quick fix for missing django_session table on Render
# Run this in the Render backend shell

echo "=== Quick Fix for Django Session Table ==="
echo "Running Django migrations to create session table..."

# Run migrations for sessions app specifically
python manage.py migrate sessions --run-syncdb

# Run all migrations to ensure everything is up to date
python manage.py migrate

# Check if table was created
python manage.py shell << EOF
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'django_session');")
    exists = cursor.fetchone()[0]
    if exists:
        print("✓ SUCCESS: django_session table now exists!")
    else:
        print("✗ ERROR: django_session table still missing")
EOF

echo "=== Fix Complete ==="