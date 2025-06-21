#!/bin/bash
# Render start script that ensures migrations are run

echo "=== Pre-start: Running Django migrations ==="
python manage.py migrate --no-input

echo "=== Pre-start: Checking subscription_plan column ==="
python scripts/check_subscription_column.py

echo "=== Starting Gunicorn ==="
exec gunicorn --bind 0.0.0.0:$PORT pyfactor.wsgi:application