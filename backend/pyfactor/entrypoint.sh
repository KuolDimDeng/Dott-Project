#!/bin/bash

set -e

until nc -z $DB_HOST $DB_PORT; do
  echo "Waiting for database at $DB_HOST:$DB_PORT..."
  sleep 1
done

echo "Database is up - executing command"

# Run migrations
python manage.py migrate

# Ensure critical tables exist (production safety)
python scripts/startup_ensure_locationlog.py || true

# Start the development server
exec "$@"