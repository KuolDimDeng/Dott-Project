#!/usr/bin/env python3
"""
Version0001_fix_eb_deployment.py
This script fixes multiple issues with the Elastic Beanstalk deployment:
1. Fixes dependency issues in requirements-eb.txt
2. Updates hook scripts to ensure consistent paths and proper error handling
3. Ensures environment configuration is correctly set up for Python 3.9 on Amazon Linux 2023
"""

import os
import re
import sys
import shutil
from datetime import datetime

# Define paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQUIREMENTS_FILE = os.path.join(BASE_DIR, 'requirements-eb.txt')
PLATFORM_DIR = os.path.join(BASE_DIR, '.platform')
PLATFORM_HOOKS_PREBUILD = os.path.join(PLATFORM_DIR, 'hooks', 'prebuild')
PLATFORM_HOOKS_PREDEPLOY = os.path.join(PLATFORM_DIR, 'hooks', 'predeploy')
PLATFORM_HOOKS_POSTDEPLOY = os.path.join(PLATFORM_DIR, 'hooks', 'postdeploy')

def create_backup(file_path):
    """Create a backup of a file before modifying it."""
    if os.path.exists(file_path):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{file_path}.backup-{timestamp}"
        shutil.copy2(file_path, backup_path)
        print(f"Backup created: {backup_path}")
        return True
    return False

def fix_requirements_file():
    """Fix problematic dependencies in requirements-eb.txt."""
    if not os.path.exists(REQUIREMENTS_FILE):
        print(f"Error: {REQUIREMENTS_FILE} not found.")
        return False
    
    # Create backup
    create_backup(REQUIREMENTS_FILE)
    
    with open(REQUIREMENTS_FILE, 'r') as f:
        content = f.read()
    
    # Fix textract and extract-msg dependency issues
    content = re.sub(r'textract==1\.6\.5', 'textract==1.6.4', content)
    content = re.sub(r'extract-msg\s*\(<=0\.29\.\*\)', 'extract-msg==0.28.7', content)
    
    # Ensure pip version is compatible with older Python
    content = re.sub(r'pip==.*', 'pip<24.0', content)
    
    # Add comments explaining the changes
    content = content.replace('# Modified requirements for Elastic Beanstalk deployment', 
                             '# Modified requirements for Elastic Beanstalk deployment\n'
                             '# Fixed by Version0001_fix_eb_deployment.py\n'
                             '# Changes:\n'
                             '#  - Downgraded textract to 1.6.4 to avoid metadata issues\n'
                             '#  - Fixed extract-msg version syntax\n'
                             '#  - Pinned pip to version compatible with Python 3.9')
    
    with open(REQUIREMENTS_FILE, 'w') as f:
        f.write(content)
    
    print(f"Updated {REQUIREMENTS_FILE} with fixed dependencies")
    return True

def update_hook_script(file_path, is_prebuild=False):
    """Update hook script with correct paths and improved error handling."""
    if not os.path.exists(file_path):
        print(f"Warning: {file_path} not found, creating it.")
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
    else:
        # Create backup
        create_backup(file_path)
    
    # Different paths are used during different deployment phases
    venv_path = "/var/app/staging/venv" if is_prebuild else "/var/app/venv"
    app_path = "/var/app/staging" if is_prebuild else "/var/app/current"
    
    script_content = f"""#!/bin/bash
# Updated by Version0001_fix_eb_deployment.py script
# This script runs {"before building" if is_prebuild else "during" if "predeploy" in file_path else "after"} the application deployment

set -e   # Exit on error
set -x   # Print commands for debugging

echo "Running {"prebuild" if is_prebuild else "predeploy" if "predeploy" in file_path else "postdeploy"} tasks..."

# Define paths
APP_DIR="{app_path}"
VENV_DIR="{venv_path}"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment at $VENV_DIR"
    python3 -m venv "$VENV_DIR"
fi

# Activate virtual environment
echo "Activating virtual environment"
source "$VENV_DIR/bin/activate" || {{
    echo "Failed to activate virtual environment. Creating a new one..."
    # Recreate if activation fails
    rm -rf "$VENV_DIR"
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
}}

# Verify virtual environment is active
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Error: Virtual environment not activated correctly"
    exit 1
fi

# Set Django settings module to EB-specific settings
export DJANGO_SETTINGS_MODULE="pyfactor.settings_eb"
"""

    # Add specific commands based on hook type
    if is_prebuild:
        script_content += """
# Install or upgrade pip to compatible version
pip install "pip<24.0"

# Install dependencies from requirements-eb.txt (EB-specific requirements)
if [ -f "$APP_DIR/requirements-eb.txt" ]; then
    echo "Installing dependencies from requirements-eb.txt"
    pip install -r "$APP_DIR/requirements-eb.txt"
else
    # Fallback to regular requirements if EB-specific doesn't exist
    if [ -f "$APP_DIR/requirements.txt" ]; then
        echo "Installing dependencies from requirements.txt"
        pip install -r "$APP_DIR/requirements.txt"
    fi
fi

# Install PostgreSQL libraries if needed
echo "Ensuring PostgreSQL libraries are installed"
which yum > /dev/null && {
    yum list installed | grep -qw postgresql-devel || sudo yum install -y postgresql-devel
}
"""
    elif "predeploy" in file_path:
        script_content += """
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
"""
    else:  # postdeploy
        script_content += """
# Run database migrations
echo "Running database migrations..."
cd "$APP_DIR"
python manage.py migrate --noinput

# Create logs directory if it doesn't exist
mkdir -p "$APP_DIR/logs"

# Create health check file
touch "$APP_DIR/health_check_passed"
"""

    script_content += f"""
echo "{'Prebuild' if is_prebuild else 'Predeploy' if 'predeploy' in file_path else 'Postdeploy'} tasks complete."
"""

    with open(file_path, 'w') as f:
        f.write(script_content)
    
    # Make the script executable
    os.chmod(file_path, 0o755)
    
    print(f"Updated {file_path} with improved error handling and correct paths")
    return True

def main():
    """Main function to run all fixes."""
    print("Starting Elastic Beanstalk deployment fixes...")
    
    # Fix requirements file
    req_fixed = fix_requirements_file()
    
    # Create directories if they don't exist
    os.makedirs(PLATFORM_HOOKS_PREBUILD, exist_ok=True)
    os.makedirs(PLATFORM_HOOKS_PREDEPLOY, exist_ok=True)
    os.makedirs(PLATFORM_HOOKS_POSTDEPLOY, exist_ok=True)
    
    # Update hook scripts
    prebuild_fixed = update_hook_script(
        os.path.join(PLATFORM_HOOKS_PREBUILD, '01_install_dependencies.sh'), 
        is_prebuild=True
    )
    
    predeploy_fixed = update_hook_script(
        os.path.join(PLATFORM_HOOKS_PREDEPLOY, '01_django_setup.sh'), 
        is_prebuild=False
    )
    
    postdeploy_fixed = update_hook_script(
        os.path.join(PLATFORM_HOOKS_POSTDEPLOY, '01_django_migrate.sh'), 
        is_prebuild=False
    )
    
    # Report results
    print("\nElastic Beanstalk Deployment Fix Results:")
    print(f"✓ Requirements file: {'Fixed' if req_fixed else 'Failed'}")
    print(f"✓ Prebuild hook script: {'Fixed' if prebuild_fixed else 'Failed'}")
    print(f"✓ Predeploy hook script: {'Fixed' if predeploy_fixed else 'Failed'}")
    print(f"✓ Postdeploy hook script: {'Fixed' if postdeploy_fixed else 'Failed'}")
    
    if all([req_fixed, prebuild_fixed, predeploy_fixed, postdeploy_fixed]):
        print("\nAll fixes applied successfully!")
        print("Next steps:")
        print("1. Review the changes")
        print("2. Deploy to Elastic Beanstalk with: eb deploy")
        print("3. If needed, create a new environment with: eb create pyfactor-dev-env-7 -p python-3.9 -i t3.small -k aws-eb")
        return 0
    else:
        print("\nSome fixes failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
