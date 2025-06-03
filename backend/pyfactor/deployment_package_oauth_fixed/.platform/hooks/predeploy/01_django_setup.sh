#!/bin/bash
# Updated by Version0001_fix_eb_deployment.py script
# This script runs during the application deployment

set -e   # Exit on error
set -x   # Print commands for debugging

echo "Running predeploy tasks..."

# Define paths
APP_DIR="/var/app/current"
VENV_DIR="/var/app/venv"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment at $VENV_DIR"
    python3 -m venv "$VENV_DIR"
fi

# Activate virtual environment
echo "Activating virtual environment"
source "$VENV_DIR/bin/activate" || {
    echo "Failed to activate virtual environment. Creating a new one..."
    # Recreate if activation fails
    rm -rf "$VENV_DIR"
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
}

# Verify virtual environment is active
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Error: Virtual environment not activated correctly"
    exit 1
fi

# Set Django settings module to EB-specific settings
export DJANGO_SETTINGS_MODULE="pyfactor.settings_eb"

# Create logs directory if it doesn't exist
mkdir -p "$APP_DIR/logs"

# Collect static files
echo "Collecting static files..."
cd "$APP_DIR"
python manage.py collectstatic --noinput

# Create directory for static files if it doesn't exist
mkdir -p "$APP_DIR/staticfiles"

# Set permissions for static files
chmod -R 755 "$APP_DIR/staticfiles"

echo "Predeploy tasks complete."
