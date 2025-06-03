#!/bin/bash
# Updated by Version0001_fix_eb_deployment.py script
# This script runs after the application deployment

set -e   # Exit on error
set -x   # Print commands for debugging

echo "Running postdeploy tasks..."

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

# Run database migrations
echo "Running database migrations..."
cd "$APP_DIR"
python manage.py migrate --noinput

# Create logs directory if it doesn't exist
mkdir -p "$APP_DIR/logs"

# Create health check file
touch "$APP_DIR/health_check_passed"

echo "Postdeploy tasks complete."
