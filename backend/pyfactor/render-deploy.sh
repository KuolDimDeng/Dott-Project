#!/bin/bash

# Render deployment script for PyFactor Django backend
set -e

echo "=== Django Application Startup ==="
echo "Time: $(date)"
echo "Python: $(python --version)"
echo "Working directory: $(pwd)"
echo "DJANGO_SETTINGS_MODULE: ${DJANGO_SETTINGS_MODULE:-pyfactor.settings}"

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Test Django configuration
echo "Testing Django configuration..."
python -c "import django; django.setup(); print('✅ Django setup successful!')"

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Run migrations
echo "Running migrations..."
python manage.py migrate

# Create superuser if it doesn't exist (optional)
if [ "$CREATE_SUPERUSER" = "true" ]; then
    echo "Creating superuser..."
    python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='${DJANGO_SUPERUSER_EMAIL}').exists():
    User.objects.create_superuser('${DJANGO_SUPERUSER_EMAIL}', '${DJANGO_SUPERUSER_PASSWORD}')
    print('Superuser created')
else:
    print('Superuser already exists')
"
fi

# Start the application
echo "Starting Gunicorn server..."
exec gunicorn pyfactor.wsgi:application --bind 0.0.0.0:$PORT --workers 3 