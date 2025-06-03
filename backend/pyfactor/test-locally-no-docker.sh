#!/bin/bash

# Test Django application locally without Docker
# This simulates what would run inside the Docker container

set -e

echo "=== Testing Django Application Locally ==="
echo "Time: $(date)"

# Create a virtual environment if it doesn't exist
if [ ! -d "test_venv" ]; then
    echo "Creating test virtual environment..."
    python3 -m venv test_venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source test_venv/bin/activate

# Install dependencies
echo "Installing dependencies from requirements-eb.txt..."
pip install -r requirements-eb.txt

# Set environment variables
export DJANGO_SETTINGS_MODULE=pyfactor.settings_eb
export PYTHONUNBUFFERED=1
export SECRET_KEY="temporary-secret-key-for-deployment"
export RDS_DB_NAME=dott_main
export RDS_USERNAME=dott_admin
export RDS_PASSWORD=RRfXU6uPPUbBEg1JqGTJ
export RDS_HOSTNAME=dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com
export RDS_PORT=5432

echo "Environment variables set:"
echo "DJANGO_SETTINGS_MODULE=$DJANGO_SETTINGS_MODULE"

# Test Django setup
echo ""
echo "Testing Django configuration..."
python -c "
import django
django.setup()
print('✓ Django setup successful')
" || {
    echo "✗ Django setup failed!"
    echo "Error details:"
    python -c "
import traceback
try:
    import django
    django.setup()
except Exception as e:
    traceback.print_exc()
"
    exit 1
}

# Check if manage.py exists
if [ ! -f "manage.py" ]; then
    echo "ERROR: manage.py not found!"
    exit 1
fi

# Try to collect static files
echo ""
echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "Warning: collectstatic failed"

# Test the health endpoint locally
echo ""
echo "Starting development server..."
echo "Server will run on http://localhost:8000"
echo "Health check endpoint: http://localhost:8000/health/"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the development server
python manage.py runserver 0.0.0.0:8000 