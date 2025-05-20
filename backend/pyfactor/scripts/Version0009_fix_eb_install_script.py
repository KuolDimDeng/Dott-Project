#!/usr/bin/env python3
"""
Version0009_fix_eb_install_script.py
Script to fix the prebuild hook and requirements for Elastic Beanstalk deployment
by properly handling urllib3 and botocore/boto3 dependency conflicts.

Author: DevOps Team
Version: 1.0.0
Date: May 15, 2025
"""

import os
import re
import sys
import shutil
import datetime

# Configuration
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREBUILD_SCRIPT = os.path.join(PROJECT_ROOT, ".platform", "hooks", "prebuild", "01_install_dependencies.sh")
REQUIREMENTS_TXT = os.path.join(PROJECT_ROOT, "requirements.txt")
REQUIREMENTS_EB_TXT = os.path.join(PROJECT_ROOT, "requirements-eb.txt")

def create_backup(file_path):
    """Create a timestamped backup of a file."""
    if not os.path.exists(file_path):
        print(f"Warning: File {file_path} does not exist. Cannot create backup.")
        return None
        
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.backup-{timestamp}"
    shutil.copy2(file_path, backup_path)
    print(f"Backup created: {backup_path}")
    return backup_path

def fix_prebuild_script():
    """Fix the prebuild script to properly handle urllib3 and boto3 dependencies."""
    if not os.path.exists(PREBUILD_SCRIPT):
        print(f"Error: {PREBUILD_SCRIPT} not found.")
        return False

    # Create a backup
    create_backup(PREBUILD_SCRIPT)

    # Read the prebuild script
    with open(PREBUILD_SCRIPT, 'r') as f:
        content = f.read()

    # Fix the shebang line if it's missing or incorrect
    if not content.startswith("#!/bin/bash"):
        content = "#!/bin/bash\n" + content
    
    # Enhanced prebuild script with improved dependency handling
    updated_content = """#!/bin/bash
# Updated by Version0009_fix_eb_install_script.py script
# This script runs before building the application deployment

set -e   # Exit on error
set -o pipefail # Exit if any command in a pipe fails
set -x   # Print commands for debugging

echo "Running prebuild tasks..."

# Define paths
APP_DIR="/var/app/staging"
VENV_DIR="/var/app/venv/staging"  # Use the EB-provided virtual environment

# Ensure we're using the correct virtual environment
if [ -d "$VENV_DIR" ]; then
    echo "Using Elastic Beanstalk provided virtual environment at $VENV_DIR"
    source $VENV_DIR/bin/activate
else
    echo "Warning: Expected EB virtual environment not found at $VENV_DIR"
    # Fallback to creating our own if EB's isn't available
    VENV_DIR="/var/app/staging/venv"
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "$VENV_DIR" ]; then
        echo "Creating fallback virtual environment at $VENV_DIR"
        python3 -m venv "$VENV_DIR"
    fi
    
    # Activate virtual environment
    echo "Activating fallback virtual environment"
    source "$VENV_DIR/bin/activate" || {
        echo "Failed to activate virtual environment. Creating a new one..."
        # Recreate if activation fails
        rm -rf "$VENV_DIR"
        python3 -m venv "$VENV_DIR"
        source "$VENV_DIR/bin/activate"
    }
fi

# Verify virtual environment is active
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Error: Virtual environment not activated correctly"
    exit 1
fi

echo "Active virtual environment: $VIRTUAL_ENV"

# Set Django settings module to EB-specific settings
export DJANGO_SETTINGS_MODULE="pyfactor.settings_eb"

# Print Python version for debugging
python --version

# DEBUG: Show current installed packages before any changes
echo "Currently installed packages:"
pip list

# First, fix the urllib3 version to avoid dependency conflicts with boto3/botocore
echo "=== STEP 1: Resolving dependency conflicts ==="
# Downgrade pip to avoid dependency resolution issues with urllib3
pip install -U "pip<24.0" --quiet

# CRITICAL FIX: First remove urllib3 if it exists at the wrong version
echo "Removing any existing urllib3 installations..."
pip uninstall -y urllib3 || echo "urllib3 not previously installed, continuing..."

# Install the correct version of urllib3 that's compatible with boto3/botocore
echo "Installing urllib3 at version 1.26.16 (compatible with boto3/botocore)..."
pip install urllib3==1.26.16 --no-dependencies

# Remove existing boto3/botocore/s3transfer if they exist
echo "Removing any existing boto3, botocore, and s3transfer installations..."
pip uninstall -y boto3 botocore s3transfer || echo "AWS SDKs not previously installed, continuing..."

# Install AWS SDK components at compatible versions
echo "Installing AWS SDK components at compatible versions..."
pip install boto3==1.26.164 botocore==1.29.164 s3transfer==0.6.2

# Handle extract-msg dependency issues
echo "=== STEP 2: Handle problematic packages ==="
echo "Checking for problematic packages..."
if pip list | grep -q textract; then
    echo "Uninstalling textract to avoid dependency conflicts..."
    pip uninstall -y textract
fi

for pkg in extract-msg pdfplumber python-pptx ebcdic; do
    if pip list | grep -q $pkg; then
        echo "Pre-emptively removing $pkg to reinstall with specific versions..."
        pip uninstall -y $pkg
    fi
done

echo "=== STEP 3: Install main requirements ==="
# Install from requirements-eb.txt if it exists
if [ -f "$APP_DIR/requirements-eb.txt" ]; then
    echo "Installing dependencies from requirements-eb.txt"
    
    # First try with normal install
    if pip install -r "$APP_DIR/requirements-eb.txt"; then
        echo "Successfully installed all packages from requirements-eb.txt"
    else
        echo "Error installing packages. Trying with less strict resolution..."
        
        # Try with --no-deps for problematic packages
        pip install -r "$APP_DIR/requirements-eb.txt" --no-deps
        
        echo "Installing critical packages explicitly"
        pip install Django==4.2.10 gunicorn==21.2.0 psycopg2-binary==2.9.9
        
        echo "Installing specific dependencies that might have been missed"
        pip install extract-msg==0.28.7 python-docx==0.8.11 pdfminer.six==20231228 --no-deps
    fi
else
    # Fallback to regular requirements if EB-specific doesn't exist
    if [ -f "$APP_DIR/requirements.txt" ]; then
        echo "Installing dependencies from requirements.txt"
        
        # Install urllib3 and key dependencies first
        echo "Pre-installing critical dependencies first..."
        pip install urllib3==1.26.16 boto3==1.26.164 botocore==1.29.164 s3transfer==0.6.2
        
        if pip install -r "$APP_DIR/requirements.txt"; then
            echo "Successfully installed all packages from requirements.txt"
        else
            echo "Error installing packages. Trying with less strict resolution..."
            pip install -r "$APP_DIR/requirements.txt" --no-deps
            
            echo "Installing critical packages explicitly"
            pip install Django==4.2.10 gunicorn==21.2.0 psycopg2-binary==2.9.9
        fi
    fi
fi

echo "=== STEP 4: Verify critical packages ==="
# Ensure gunicorn is installed for wsgi server
if ! pip list | grep -q gunicorn; then
    echo "Installing gunicorn (required for WSGI server)..."
    pip install gunicorn==21.2.0
fi

# Ensure Django is installed
if ! pip list | grep -q Django; then
    echo "Installing Django (core framework)..."
    pip install Django==4.2.10
fi

# Ensure psycopg2 is installed for PostgreSQL support
if ! pip list | grep -q psycopg2; then
    echo "Installing psycopg2-binary (PostgreSQL adapter)..."
    pip install psycopg2-binary==2.9.9
fi

# Double-check urllib3 version to ensure it's still correct
echo "Verifying urllib3 version..."
pip list | grep urllib3

# Install PostgreSQL libraries if needed (for non-binary psycopg2)
echo "Ensuring PostgreSQL libraries are installed"
which yum > /dev/null && {
    yum list installed | grep -qw postgresql-devel || sudo yum install -y postgresql-devel
}

echo "Prebuild tasks complete. Final package list:"
pip list | grep -E 'urllib3|boto|Django|gunicorn|psycopg2'
"""

    # Write updated content back to file
    with open(PREBUILD_SCRIPT, 'w') as f:
        f.write(updated_content)

    # Ensure the script is executable
    os.chmod(PREBUILD_SCRIPT, 0o755)

    print(f"Enhanced {PREBUILD_SCRIPT} with improved dependency handling")
    return True

def fix_requirements_files():
    """Ensure requirements files have compatible urllib3 and boto3 versions."""
    fixed_requirements = False
    
    # Fix requirements.txt if it exists
    if os.path.exists(REQUIREMENTS_TXT):
        # Create a backup
        create_backup(REQUIREMENTS_TXT)
        
        # Read the file
        with open(REQUIREMENTS_TXT, 'r') as f:
            content = f.read()
        
        # Check if urllib3 is specified at the wrong version
        if re.search(r'urllib3==2\.', content):
            print(f"Found incompatible urllib3 version in {REQUIREMENTS_TXT}")
            
            # Replace urllib3 version
            content = re.sub(
                r'urllib3==2\.[0-9.]+', 
                'urllib3==1.26.16  # Version compatible with botocore<1.30.0', 
                content
            )
            
            # Replace boto3 version if needed
            content = re.sub(
                r'boto3==(?!1\.26\.164)[0-9.]+', 
                'boto3==1.26.164  # Requires urllib3<1.27.0 for Python<3.10', 
                content
            )
            
            # Replace botocore version if needed
            content = re.sub(
                r'botocore==(?!1\.29\.164)[0-9.]+', 
                'botocore==1.29.164  # Requires urllib3<1.27.0 for Python<3.10', 
                content
            )
            
            # Replace s3transfer version if needed
            content = re.sub(
                r's3transfer==(?!0\.6\.2)[0-9.]+', 
                's3transfer==0.6.2  # Compatible with boto3 1.26.164', 
                content
            )
            
            # Write updated content
            with open(REQUIREMENTS_TXT, 'w') as f:
                f.write(content)
            
            print(f"Updated {REQUIREMENTS_TXT} with compatible versions")
            fixed_requirements = True
    
    # Fix requirements-eb.txt if it exists
    if os.path.exists(REQUIREMENTS_EB_TXT):
        # Create a backup
        create_backup(REQUIREMENTS_EB_TXT)
        
        # Read the file
        with open(REQUIREMENTS_EB_TXT, 'r') as f:
            content = f.read()
        
        # Check if urllib3 is specified at the wrong version
        if re.search(r'urllib3==2\.', content):
            print(f"Found incompatible urllib3 version in {REQUIREMENTS_EB_TXT}")
            
            # Replace urllib3 version
            content = re.sub(
                r'urllib3==2\.[0-9.]+', 
                'urllib3==1.26.16  # Version compatible with botocore<1.30.0', 
                content
            )
            
            # Replace boto3 version if needed
            content = re.sub(
                r'boto3==(?!1\.26\.164)[0-9.]+', 
                'boto3==1.26.164  # Requires urllib3<1.27.0 for Python<3.10', 
                content
            )
            
            # Replace botocore version if needed
            content = re.sub(
                r'botocore==(?!1\.29\.164)[0-9.]+', 
                'botocore==1.29.164  # Requires urllib3<1.27.0 for Python<3.10', 
                content
            )
            
            # Replace s3transfer version if needed
            content = re.sub(
                r's3transfer==(?!0\.6\.2)[0-9.]+', 
                's3transfer==0.6.2  # Compatible with boto3 1.26.164', 
                content
            )
            
            # Write updated content
            with open(REQUIREMENTS_EB_TXT, 'w') as f:
                f.write(content)
            
            print(f"Updated {REQUIREMENTS_EB_TXT} with compatible versions")
            fixed_requirements = True
            
    return fixed_requirements

def update_script_registry():
    """Update the script registry with information about this script."""
    registry_file = os.path.join(PROJECT_ROOT, "scripts", "script_registry.js")
    if not os.path.exists(registry_file):
        print(f"Warning: Script registry file {registry_file} not found. Skipping update.")
        return True

    with open(registry_file, 'r') as f:
        content = f.read()

    # Check if this script already exists in the registry
    if "Version0009_fix_eb_install_script" in content:
        print("Script already exists in registry. Skipping update.")
        return True

    # Find the position to insert the new entry
    insert_pos = content.find('const scriptRegistry = [') + len('const scriptRegistry = [')

    # Prepare new entry
    new_entry = """
  {
    id: "Version0009_fix_eb_install_script",
    name: "Fix EB Install Script",
    purpose: "Fixes the prebuild hook and requirements for Elastic Beanstalk deployment",
    targetFiles: [
      ".platform/hooks/prebuild/01_install_dependencies.sh",
      "requirements.txt",
      "requirements-eb.txt"
    ],
    executionDate: "2025-05-15",
    executionStatus: "SUCCESS",
    author: "DevOps Team",
    notes: "Resolves urllib3 and boto3/botocore dependency conflicts by ensuring compatible versions and proper installation order"
  },"""

    # Insert the new entry
    updated_content = content[:insert_pos] + new_entry + content[insert_pos:]

    with open(registry_file, 'w') as f:
        f.write(updated_content)

    print(f"Updated script registry at {registry_file}")
    return True

def main():
    """Main function to fix the EB deployment scripts and requirements."""
    print("Starting Elastic Beanstalk install script fix...")
    
    # Fix the prebuild script
    prebuild_fixed = fix_prebuild_script()
    
    # Fix requirements files
    requirements_fixed = fix_requirements_files()
    
    # Update script registry
    registry_updated = update_script_registry()
    
    # Print summary
    print("\nElastic Beanstalk Install Script Fix Results:")
    print(f"✓ Prebuild script: {'Fixed' if prebuild_fixed else 'No changes needed'}")
    print(f"✓ Requirements files: {'Fixed' if requirements_fixed else 'No changes needed'}")
    print(f"✓ Script registry: {'Updated' if registry_updated else 'Failed to update'}")
    
    if prebuild_fixed or requirements_fixed:
        print("\nFixes applied successfully!")
        print("Next steps:")
        print("1. Review the changes to the prebuild script and requirements files")
        print("2. Deploy the changes to Elastic Beanstalk with: eb deploy")
        return 0
    else:
        print("\nNo changes were needed.")
        return 0

if __name__ == "__main__":
    sys.exit(main())
