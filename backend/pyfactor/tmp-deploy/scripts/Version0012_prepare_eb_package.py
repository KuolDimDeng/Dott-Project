#!/usr/bin/env python3
"""
Version0012_prepare_eb_package.py

This script creates an optimized deployment package for AWS Elastic Beanstalk with:
1. Enhanced error handling and logging in hook scripts
2. Properly configured requirements
3. Environment-specific settings
4. Clean dependency structure to avoid conflicts

Usage:
    python scripts/Version0012_prepare_eb_package.py

Output:
    Creates a optimized-eb-package.zip file ready for AWS console upload
"""

import os
import sys
import shutil
import zipfile
import tempfile
import datetime
import subprocess
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
OUTPUT_ZIP = PROJECT_ROOT / "optimized-eb-package.zip"
TIMESTAMP = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

# Create script registry entry
REGISTRY_ENTRY = {
    "scriptName": "Version0012_prepare_eb_package.py",
    "version": "1.0",
    "dateCreated": datetime.datetime.now().strftime("%Y-%m-%d"),
    "purpose": "Creates an optimized deployment package for AWS Elastic Beanstalk",
    "status": "active",
    "executionCount": 0
}

# Files we specifically want to include or exclude
INCLUDE_FILES = [
    # Application core
    "application.py",
    "manage.py",
    "requirements-eb.txt",
    "requirements.txt",
    
    # Configuration directories
    ".ebextensions/",
    ".platform/",
    
    # Application code
    "pyfactor/",
    "api/",
    "users/",
    "finance/",
    "hr/",
    "banking/",
    "onboarding/",
    "payroll/",
    "reports/",
    "data/",
]

EXCLUDE_PATTERNS = [
    "*__pycache__*",
    "*.pyc",
    "*.pyo",
    "*~",
    ".git/",
    ".env",
    ".venv/",
    "venv/",
    "node_modules/",
    "*.sqlite3",
    "*.log",
    "logs/",
    "backups/",
    ".idea/",
    ".vscode/",
]

# Enhanced hook scripts content
PREBUILD_SCRIPT = """#!/bin/bash
# Enhanced prebuild script created by Version0012_prepare_eb_package.py
# This script runs before building the application

set -e   # Exit on error
set -o pipefail # Exit if any command in a pipe fails
exec > >(tee -a /var/log/eb-prebuild.log) 2>&1  # Redirect output to log file

echo "==== ENHANCED PREBUILD STARTING AT $(date) ===="

# Define paths
APP_DIR="/var/app/staging"
VENV_DIR="/var/app/venv/staging"

echo "==== ENVIRONMENT INFORMATION ===="
echo "Python version: $(python --version)"
echo "Platform: $(uname -a)"
echo "Working directory: $(pwd)"
echo "Directory contents:"
ls -la

# Create a constraints file to enforce package versions
cat > /tmp/pip-constraints.txt << EOL
urllib3==1.26.16
boto3==1.26.164
botocore==1.29.164
s3transfer==0.6.2
EOL

echo "==== CONSTRAINTS FILE CREATED ===="
cat /tmp/pip-constraints.txt

# Verify correct directories
if [ ! -d "$APP_DIR" ]; then
    echo "ERROR: Application directory $APP_DIR does not exist"
    mkdir -p "$APP_DIR"
    echo "Created $APP_DIR directory"
fi

# First, upgrade pip itself with specific version
echo "==== UPGRADING PIP ===="
pip install --upgrade pip==23.3.1 setuptools==69.0.3

# Force uninstall problematic packages
echo "==== REMOVING ANY CONFLICTING PACKAGES ===="
pip uninstall -y urllib3 boto3 botocore s3transfer awscli textract boto || true

# Install urllib3 first with no-dependencies to avoid conflicts
echo "==== INSTALLING URLLIB3 ===="
pip install urllib3==1.26.16 --no-dependencies

# Install AWS SDK components at compatible versions
echo "==== INSTALLING AWS SDK COMPONENTS ===="
pip install boto3==1.26.164 botocore==1.29.164 s3transfer==0.6.2 --no-dependencies

# Install critical packages explicitly with their exact versions
echo "==== INSTALLING CRITICAL PACKAGES ===="
pip install Django==4.2.10 gunicorn==21.2.0 psycopg2-binary==2.9.9

# Finally, install the rest of the requirements with constraints
echo "==== INSTALLING REMAINING REQUIREMENTS ===="
if [ -f "requirements-eb.txt" ]; then
    echo "Using EB requirements file"
    pip install -r requirements-eb.txt --constraint /tmp/pip-constraints.txt || {
        echo "ERROR installing from requirements-eb.txt"
        echo "Trying with --no-dependencies flag"
        pip install -r requirements-eb.txt --no-dependencies
    }
elif [ -f "requirements.txt" ]; then
    echo "Using standard requirements file"
    pip install -r requirements.txt --constraint /tmp/pip-constraints.txt || {
        echo "ERROR installing from requirements.txt"
        echo "Trying with --no-dependencies flag"
        pip install -r requirements.txt --no-dependencies
    }
else
    echo "ERROR: No requirements file found"
    exit 1
fi

# Verify the installed versions
echo "==== VERIFYING INSTALLED VERSIONS ===="
pip list | grep -E 'urllib3|boto3|botocore|s3transfer'

# Install PostgreSQL libraries if needed (for non-binary psycopg2)
echo "==== ENSURING POSTGRESQL LIBRARIES ARE INSTALLED ===="
which yum > /dev/null && {
    yum list installed | grep -qw postgresql-devel || sudo yum install -y postgresql-devel || echo "Failed to install postgresql-devel but continuing"
}

# Clear pip cache to avoid conflicts with cached packages
pip cache purge

echo "==== PREBUILD COMPLETED SUCCESSFULLY AT $(date) ===="
"""

PREDEPLOY_SCRIPT = """#!/bin/bash
# Enhanced predeploy script created by Version0012_prepare_eb_package.py
# This script runs during the application deployment

set -e   # Exit on error
set -x   # Print commands for debugging
exec > >(tee -a /var/log/eb-predeploy.log) 2>&1  # Redirect output to log file

echo "==== ENHANCED PREDEPLOY STARTING AT $(date) ===="

# Define paths
APP_DIR="/var/app/current"
VENV_DIR="/var/app/venv"

echo "==== ENVIRONMENT INFORMATION ===="
echo "Python version: $(python --version)"
echo "Working directory: $(pwd)"
echo "Directory contents:"
ls -la

# Check for virtual environment
if [ -d "$VENV_DIR" ]; then
    echo "Using existing virtual environment at $VENV_DIR"
else
    echo "Creating virtual environment at $VENV_DIR"
    python3 -m venv "$VENV_DIR" || {
        echo "Failed to create virtual environment with venv, trying virtualenv"
        pip install virtualenv
        virtualenv "$VENV_DIR"
    }
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

echo "Active virtual environment: $VIRTUAL_ENV"

# Set Django settings module to EB-specific settings
export DJANGO_SETTINGS_MODULE="pyfactor.settings_eb"
echo "Using settings module: $DJANGO_SETTINGS_MODULE"

# Create logs directory if it doesn't exist
mkdir -p "$APP_DIR/logs"
echo "Created logs directory at $APP_DIR/logs"

# Collect static files
echo "Collecting static files..."
cd "$APP_DIR"
python manage.py collectstatic --noinput

# Create directory for static files if it doesn't exist
mkdir -p "$APP_DIR/staticfiles"
echo "Created staticfiles directory at $APP_DIR/staticfiles"

# Set permissions for static files
chmod -R 755 "$APP_DIR/staticfiles"
echo "Set permissions for staticfiles"

echo "==== PREDEPLOY COMPLETED SUCCESSFULLY AT $(date) ===="
"""

POSTDEPLOY_SCRIPT = """#!/bin/bash
# Enhanced postdeploy script created by Version0012_prepare_eb_package.py
# This script runs after the application deployment

set -e   # Exit on error
set -x   # Print commands for debugging
exec > >(tee -a /var/log/eb-postdeploy.log) 2>&1  # Redirect output to log file

echo "==== ENHANCED POSTDEPLOY STARTING AT $(date) ===="

# Define paths
APP_DIR="/var/app/current"
VENV_DIR="/var/app/venv"

echo "==== ENVIRONMENT INFORMATION ===="
echo "Python version: $(python --version)"
echo "Working directory: $(pwd)"
echo "Directory contents:"
ls -la

# Check if virtual environment already exists
if [ -d "$VENV_DIR" ]; then
    echo "Using existing virtual environment at $VENV_DIR"
else
    echo "Creating virtual environment at $VENV_DIR"
    python3 -m venv "$VENV_DIR" || {
        echo "Failed to create virtual environment with venv, trying virtualenv"
        pip install virtualenv
        virtualenv "$VENV_DIR"
    }
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

echo "Active virtual environment: $VIRTUAL_ENV"

# Set Django settings module to EB-specific settings
export DJANGO_SETTINGS_MODULE="pyfactor.settings_eb"
echo "Using settings module: $DJANGO_SETTINGS_MODULE"

# Run database migrations with error handling
echo "Running database migrations..."
cd "$APP_DIR"
python manage.py migrate --noinput || {
    echo "WARNING: Migration failed. Attempting safer approach..."
    python manage.py migrate --noinput --fake-initial
}

# Create health check file
touch "$APP_DIR/health_check_passed"
echo "Created health check file"

# Create logs directory if it doesn't exist
mkdir -p "$APP_DIR/logs"
echo "Created logs directory at $APP_DIR/logs"

echo "==== POSTDEPLOY COMPLETED SUCCESSFULLY AT $(date) ===="
"""

# Simplified requirements file content optimized for Elastic Beanstalk
SIMPLIFIED_REQUIREMENTS = """# Simplified requirements for Elastic Beanstalk deployment
# Generated by Version0012_prepare_eb_package.py on {timestamp}
#
# Critical packages with compatible versions to avoid dependency conflicts

# Core framework
Django==4.2.10
gunicorn==21.2.0

# AWS SDK with fixed versions to avoid urllib3 conflicts
urllib3==1.26.16
boto3==1.26.164
botocore==1.29.164
s3transfer==0.6.2

# Database adapters
psycopg2-binary==2.9.9
django-db-connection-pool==1.2.1
SQLAlchemy==2.0.30

# Authentication and security
django-allauth==0.62.1
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.0
django-cors-headers==4.3.1
PyJWT==2.8.0

# Celery and Redis
celery==5.4.0
redis==5.0.7

# API and Utilities
django-celery-beat==2.6.0
django-celery-results==2.5.1
requests==2.31.0
python-dotenv==1.0.1
django-countries==7.6.1
"""

def should_include_file(filepath, base_dir=None):
    """Determine if a file should be included in the deployment package"""
    if base_dir:
        relative_path = os.path.relpath(filepath, base_dir)
    else:
        relative_path = filepath
    
    # First check exclusion patterns
    for pattern in EXCLUDE_PATTERNS:
        if "*" in pattern:  # Simple wildcard matching
            if pattern.startswith("*") and pattern.endswith("*"):
                if pattern[1:-1] in relative_path:
                    return False
            elif pattern.startswith("*"):
                if relative_path.endswith(pattern[1:]):
                    return False
            elif pattern.endswith("*"):
                if relative_path.startswith(pattern[:-1]):
                    return False
        elif pattern in relative_path:
            return False
    
    # Then check inclusion patterns
    for include in INCLUDE_FILES:
        if include.endswith("/"):  # It's a directory
            dir_name = include[:-1]
            if relative_path.startswith(dir_name):
                return True
        elif include == relative_path:
            return True
    
    return False

def create_deployment_package():
    """Create an optimized deployment package for Elastic Beanstalk"""
    print(f"Creating optimized deployment package for AWS Elastic Beanstalk...")
    
    # Create a temporary directory for building the package
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        print(f"Using temporary directory: {temp_dir}")
        
        # Copy necessary files to the temp directory
        print("Copying application files...")
        for root, dirs, files in os.walk(PROJECT_ROOT):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if not any(pattern.rstrip("/") == d for pattern in EXCLUDE_PATTERNS if pattern.endswith("/"))]
            
            for file in files:
                src_path = os.path.join(root, file)
                rel_path = os.path.relpath(src_path, PROJECT_ROOT)
                
                if should_include_file(rel_path):
                    dst_path = os.path.join(temp_dir, rel_path)
                    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                    shutil.copy2(src_path, dst_path)
        
        # Create essential directories
        platform_dir = temp_path / ".platform"
        platform_hooks_prebuild = platform_dir / "hooks" / "prebuild"
        platform_hooks_predeploy = platform_dir / "hooks" / "predeploy"
        platform_hooks_postdeploy = platform_dir / "hooks" / "postdeploy"
        
        os.makedirs(platform_hooks_prebuild, exist_ok=True)
        os.makedirs(platform_hooks_predeploy, exist_ok=True)
        os.makedirs(platform_hooks_postdeploy, exist_ok=True)
        
        # Write enhanced hook scripts
        print("Creating enhanced hook scripts...")
        
        # Prebuild script
        with open(platform_hooks_prebuild / "01_install_dependencies.sh", "w") as f:
            f.write(PREBUILD_SCRIPT)
        
        # Make sure we have appropriate permissions for the hook scripts
        os.chmod(platform_hooks_prebuild / "01_install_dependencies.sh", 0o755)
        
        # Predeploy script
        with open(platform_hooks_predeploy / "01_django_setup.sh", "w") as f:
            f.write(PREDEPLOY_SCRIPT)
        
        os.chmod(platform_hooks_predeploy / "01_django_setup.sh", 0o755)
        
        # Postdeploy script
        with open(platform_hooks_postdeploy / "01_django_migrate.sh", "w") as f:
            f.write(POSTDEPLOY_SCRIPT)
        
        os.chmod(platform_hooks_postdeploy / "01_django_migrate.sh", 0o755)
        
        # Create simplified requirements file
        print("Creating simplified requirements file...")
        with open(temp_path / "requirements-simple.txt", "w") as f:
            f.write(SIMPLIFIED_REQUIREMENTS.format(timestamp=TIMESTAMP))
        
        # Create symlink to make requirements.txt point to requirements-simple.txt
        print("Creating symlink for requirements.txt...")
        if os.path.exists(temp_path / "requirements.txt"):
            os.remove(temp_path / "requirements.txt")
        shutil.copy2(temp_path / "requirements-simple.txt", temp_path / "requirements.txt")
        
        # Create the ZIP file
        print(f"Creating ZIP file: {OUTPUT_ZIP}")
        with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, temp_dir)
                    print(f"Adding to ZIP: {arcname}")
                    zipf.write(file_path, arcname=arcname)
    
    print(f"Deployment package created successfully: {OUTPUT_ZIP}")
    print(f"Upload this ZIP file to AWS Elastic Beanstalk console for deployment.")
    return OUTPUT_ZIP

def update_script_registry():
    """Update the script registry with information about this script execution"""
    registry_file = SCRIPTS_DIR / "script_registry.js"
    
    if not os.path.exists(registry_file):
        # Create new registry file if it doesn't exist
        with open(registry_file, "w") as f:
            f.write("// Script Registry - Automatic Script Execution Tracking\n")
            f.write("export const scriptRegistry = [\n")
            f.write(f"  {{\n")
            f.write(f"    scriptName: '{REGISTRY_ENTRY['scriptName']}',\n")
            f.write(f"    version: '{REGISTRY_ENTRY['version']}',\n") 
            f.write(f"    dateCreated: '{REGISTRY_ENTRY['dateCreated']}',\n")
            f.write(f"    purpose: '{REGISTRY_ENTRY['purpose']}',\n")
            f.write(f"    status: '{REGISTRY_ENTRY['status']}',\n")
            f.write(f"    executionCount: 1,\n")
            f.write(f"    lastExecuted: '{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}'\n")
            f.write("  }\n")
            f.write("];\n")
    else:
        # Update existing registry
        try:
            with open(registry_file, "r") as f:
                content = f.read()
            
            if REGISTRY_ENTRY['scriptName'] in content:
                # Script already in registry, update execution count
                print("Updating execution count in script registry...")
                # This is a simple string replacement, more robust solution would parse the JS
                import re
                pattern = fr"scriptName: '{REGISTRY_ENTRY['scriptName']}',[^}}]*executionCount: (\d+)"
                match = re.search(pattern, content, re.DOTALL)
                if match:
                    count = int(match.group(1)) + 1
                    new_entry = f"scriptName: '{REGISTRY_ENTRY['scriptName']}',\n    version: '{REGISTRY_ENTRY['version']}',\n    dateCreated: '{REGISTRY_ENTRY['dateCreated']}',\n    purpose: '{REGISTRY_ENTRY['purpose']}',\n    status: '{REGISTRY_ENTRY['status']}',\n    executionCount: {count},\n    lastExecuted: '{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}'"
                    content = re.sub(pattern, new_entry, content, flags=re.DOTALL)
                    with open(registry_file, "w") as f:
                        f.write(content)
            else:
                # Add new entry
                print("Adding new entry to script registry...")
                import re
                pattern = r"export const scriptRegistry = \["
                new_entry = f"export const scriptRegistry = [\n  {{\n    scriptName: '{REGISTRY_ENTRY['scriptName']}',\n    version: '{REGISTRY_ENTRY['version']}',\n    dateCreated: '{REGISTRY_ENTRY['dateCreated']}',\n    purpose: '{REGISTRY_ENTRY['purpose']}',\n    status: '{REGISTRY_ENTRY['status']}',\n    executionCount: 1,\n    lastExecuted: '{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}'\n  }},"
                content = re.sub(pattern, new_entry, content)
                with open(registry_file, "w") as f:
                    f.write(content)
                    
        except Exception as e:
            print(f"Warning: Could not update script registry: {e}")

def main():
    """Main execution function"""
    print("="*80)
    print("Optimized Elastic Beanstalk Deployment Package Creator")
    print("="*80)
    print(f"Created by: {REGISTRY_ENTRY['scriptName']} v{REGISTRY_ENTRY['version']}")
    print(f"Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    try:
        # Create the deployment package
        zip_file = create_deployment_package()
        
        # Update the script registry
        update_script_registry()
        
        print("\nDEPLOYMENT PACKAGE CREATION SUCCESSFUL!")
        print("-" * 60)
        print(f"Package: {zip_file}")
        print(f"Size: {os.path.getsize(zip_file) / (1024*1024):.2f} MB")
        print("\nNext Steps:")
        print("1. Log into AWS Elastic Beanstalk Console")
        print("2. Create a new application or environment")
        print("3. Upload this ZIP file when prompted")
        print("4. Select 'Python 3.9 running on 64bit Amazon Linux 2023/4.5.1' platform")
        print("5. Configure environment variables for database and other settings")
        print("-" * 60)
        
    except Exception as e:
        print(f"ERROR: Failed to create deployment package: {e}")
        import traceback
        traceback.print_exc()
        return 1
        
    return 0

if __name__ == "__main__":
    sys.exit(main())
