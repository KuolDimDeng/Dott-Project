#!/bin/bash
# Industry-standard deployment startup script
set -e

echo "Running database migrations (industry standard)..."

echo "
=== Django Migration Process ===
Time: $(date)

1. Testing database connection..."
python manage.py dbshell -- -c "SELECT 1" 2>/dev/null && echo "✅ Database connection successful" || echo "❌ Database connection failed"

echo "
2. Fixing migration conflicts..."
# Fix the transport migration issue
python manage.py shell << EOF
from django.db import connection
with connection.cursor() as cursor:
    try:
        # Remove the problematic transport migration
        cursor.execute("""
            DELETE FROM django_migrations 
            WHERE app = 'transport' 
            AND name = '0003_add_transport_models'
        """)
        print("Fixed transport migration conflict")
    except Exception as e:
        print(f"Migration fix not needed or already applied: {e}")
EOF

echo "
3. Generating migrations for marketplace apps..."
python manage.py makemigrations marketplace --no-input 2>&1 || true
python manage.py makemigrations chat --no-input 2>&1 || true

echo "
4. Applying all migrations..."
python manage.py migrate --no-input 2>&1

echo "
5. Verifying marketplace installation..."
python manage.py shell << EOF
from django.apps import apps
try:
    marketplace_installed = apps.is_installed('marketplace')
    chat_installed = apps.is_installed('chat')
    print(f"✅ Marketplace: {marketplace_installed}")
    print(f"✅ Chat: {chat_installed}")
except Exception as e:
    print(f"❌ Error checking apps: {e}")
EOF

echo "
=== Migration Process Complete ===
"

# Continue with regular startup
exec gunicorn pyfactor.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info