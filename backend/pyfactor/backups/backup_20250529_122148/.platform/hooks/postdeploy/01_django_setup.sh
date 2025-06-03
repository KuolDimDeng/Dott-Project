#!/bin/bash

# Collect static files
echo "Collecting static files..."
cd /app
python manage.py collectstatic --noinput

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Ensure proper permissions
chmod -R 755 /app/staticfiles || true
chmod -R 755 /app/media || true

echo "Django setup completed"
