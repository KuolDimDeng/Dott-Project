#!/bin/bash
# prepare_eb_package.sh
# Wrapper script to create an optimized AWS Elastic Beanstalk deployment package
# Created as part of fixing deployment issues

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON_SCRIPT="$SCRIPT_DIR/Version0012_prepare_eb_package.py"
OUTPUT_ZIP="$BACKEND_DIR/optimized-eb-package.zip"

echo "========================================================"
echo "   AWS ELASTIC BEANSTALK DEPLOYMENT PACKAGE CREATOR"
echo "========================================================"
echo "This script will create an optimized deployment package"
echo "with enhanced error handling and dependency management."
echo "------------------------------------------------------"

# Check if the Python script exists
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo "ERROR: Python script not found: $PYTHON_SCRIPT"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python --version 2>&1)
echo "Using Python: $PYTHON_VERSION"

# Check if we're in a virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Warning: Not running in a virtual environment."
    echo "It's recommended to run this script within your project's virtual environment."
    
    # Check if .venv exists in the backend directory
    if [ -d "$BACKEND_DIR/.venv" ]; then
        echo "Found .venv directory. Activating..."
        source "$BACKEND_DIR/.venv/bin/activate" || {
            echo "Failed to activate virtual environment. Continuing without it."
        }
    elif [ -d "$BACKEND_DIR/venv" ]; then
        echo "Found venv directory. Activating..."
        source "$BACKEND_DIR/venv/bin/activate" || {
            echo "Failed to activate virtual environment. Continuing without it."
        }
    else
        echo "No virtual environment found. Continuing with system Python."
    fi
else
    echo "Using virtual environment: $VIRTUAL_ENV"
fi

# Create backup of any existing package
if [ -f "$OUTPUT_ZIP" ]; then
    BACKUP_FILE="${OUTPUT_ZIP}.backup-$(date +%Y%m%d_%H%M%S)"
    echo "Backing up existing package to: $BACKUP_FILE"
    mv "$OUTPUT_ZIP" "$BACKUP_FILE"
fi

# Run the Python script
echo "------------------------------------------------------"
echo "Creating optimized deployment package..."
echo "------------------------------------------------------"
cd "$BACKEND_DIR"
python "$PYTHON_SCRIPT"

# Check if the package was created successfully
if [ -f "$OUTPUT_ZIP" ]; then
    echo "------------------------------------------------------"
    echo "PACKAGE CREATED SUCCESSFULLY!"
    echo "Package location: $OUTPUT_ZIP"
    echo "Size: $(du -h "$OUTPUT_ZIP" | cut -f1)"
    echo "------------------------------------------------------"
    echo "Next steps:"
    echo "1. Log into AWS Elastic Beanstalk Console"
    echo "2. Create a new application or environment"
    echo "3. Choose 'Upload your code'"
    echo "4. Upload this ZIP file: $OUTPUT_ZIP"
    echo "5. Select 'Python 3.9 running on 64bit Amazon Linux 2023/4.5.1' platform"
    echo "6. Configure environment variables (especially database credentials)"
    echo "7. Complete the environment setup"
    echo "------------------------------------------------------"
else
    echo "ERROR: Failed to create deployment package."
    echo "Check the output above for errors."
    exit 1
fi

# Additional helpful instructions
echo "IMPORTANT NOTES:"
echo "- This package includes enhanced error logging and dependency management"
echo "- Database credentials must be set in environment variables"
echo "- The package uses a simplified requirements file to avoid conflicts"
echo "- All hook scripts include detailed logging for troubleshooting"
echo "------------------------------------------------------"
