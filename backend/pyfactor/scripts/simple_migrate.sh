#!/bin/bash
# Simple migration script for debugging
set -e

echo "=== Simple Migration Script ==="
echo "Time: $(date)"

# Just run migrate without any preprocessing
echo "Running migrations..."
python manage.py migrate --noinput

echo "Migrations completed successfully"