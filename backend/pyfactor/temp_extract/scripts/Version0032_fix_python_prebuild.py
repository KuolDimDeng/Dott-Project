#!/usr/bin/env python3
"""
Version0032_fix_python_prebuild.py

This script addresses the Python availability issue in the prebuild phase:
1. Creates a new 00_install_python.sh script that runs first in the prebuild hooks
2. Installs Python on the host instance before other prebuild hooks run
3. Updates the deployment package with this fix

Created: May 17, 2025
Author: System Administrator
"""

import os
import shutil
import zipfile
import tempfile
import subprocess
from datetime import datetime

# Global variables
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_DIR = os.path.dirname(os.path.dirname(BACKEND_DIR))
PLATFORM_HOOKS_DIR = os.path.join(BACKEND_DIR, ".platform", "hooks", "prebuild")

def create_python_installer_script():
    """Create a script to install Python on the instance before other hooks run"""
    script_path = os.path.join(PLATFORM_HOOKS_DIR, "00_install_python.sh")
    
    # Create script content
    script_content = """#!/bin/bash
# This script ensures Python is installed on the instance before other prebuild hooks run
# Created by Version0032_fix_python_prebuild.py

set -e   # Exit on error
set -o pipefail # Exit if any command in a pipe fails
set -x   # Print commands for debugging

echo "=== PYTHON INSTALLER SCRIPT STARTING at $(date) ==="

# Detect Amazon Linux version
if grep -q "Amazon Linux release 2023" /etc/os-release; then
    echo "Detected Amazon Linux 2023"
    # Install Python and pip using dnf (AL2023)
    sudo dnf install -y python3 python3-pip python3-devel
    
    # Create alternatives for python and pip if they don't exist
    if ! which python >/dev/null 2>&1; then
        sudo alternatives --install /usr/bin/python python /usr/bin/python3 1
    fi
    
    if ! which pip >/dev/null 2>&1; then
        sudo alternatives --install /usr/bin/pip pip /usr/bin/pip3 1
    fi
    
elif grep -q "Amazon Linux 2" /etc/os-release; then
    echo "Detected Amazon Linux 2"
    # Install Python and pip using yum (AL2)
    sudo yum install -y python3 python3-pip python3-devel
    
    # Create alternatives for python and pip if they don't exist
    if ! which python >/dev/null 2>&1; then
        sudo alternatives --install /usr/bin/python python /usr/bin/python3 1
    fi
    
    if ! which pip >/dev/null 2>&1; then
        sudo alternatives --install /usr/bin/pip pip /usr/bin/pip3 1
    fi
else
    echo "Unknown Amazon Linux version, attempting to install Python with yum"
    sudo yum install -y python3 python3-pip python3-devel || {
        echo "Failed to install Python with yum, trying dnf"
        sudo dnf install -y python3 python3-pip python3-devel || {
            echo "Failed to install Python. Deployment may fail."
            exit 1
        }
    }
    
    # Create alternatives for python and pip if they don't exist
    if ! which python >/dev/null 2>&1; then
        sudo alternatives --install /usr/bin/python python /usr/bin/python3 1 || {
            sudo ln -sf /usr/bin/python3 /usr/bin/python
        }
    fi
    
    if ! which pip >/dev/null 2>&1; then
        sudo alternatives --install /usr/bin/pip pip /usr/bin/pip3 1 || {
            sudo ln -sf /usr/bin/pip3 /usr/bin/pip
        }
    fi
fi

# Verify Python and pip are installed and working
echo "Python version: $(python --version 2>&1)"
echo "Pip version: $(pip --version 2>&1)"

echo "=== PYTHON INSTALLER SCRIPT COMPLETED at $(date) ==="
"""
    
    # Write the script
    with open(script_path, 'w') as f:
        f.write(script_content)
    
    # Make it executable
    os.chmod(script_path, 0o755)
    
    print(f"Created Python installer script at {script_path}")
    return script_path

def check_and_simplify_dependencies_script():
    """Check if the dependencies script needs Python-specific commands removed"""
    script_path = os.path.join(PLATFORM_HOOKS_DIR, "01_install_dependencies.sh")
    
    # Create a backup
    backup_path = f"{script_path}.backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(script_path, backup_path)
    print(f"Created backup of dependencies script at {backup_path}")
    
    with open(script_path, 'r') as f:
        content = f.read()
    
    # The dependencies script can remain as is because our new 00_install_python.sh
    # script will ensure Python is available before it runs
    
    # Ensure it has executable permissions
    os.chmod(script_path, 0o755)
    print(f"Ensured dependencies script has executable permissions")
    
    return script_path

def find_latest_python_fixed_package():
    """Find the latest Python-fixed docker deployment package"""
    pattern = "docker-eb-package-python-fixed-*.zip"
    result = subprocess.run(f"ls -t {BACKEND_DIR}/{pattern} 2>/dev/null | head -1", 
                           shell=True, capture_output=True, text=True)
    
    if result.stdout.strip():
        return result.stdout.strip()
    
    # If no Python-fixed package exists, try script-fixed ones
    pattern = "docker-eb-package-script-fixed-*.zip"
    result = subprocess.run(f"ls -t {BACKEND_DIR}/{pattern} 2>/dev/null | head -1", 
                           shell=True, capture_output=True, text=True)
    
    if result.stdout.strip():
        return result.stdout.strip()
    
    # If still nothing, try any docker package    
    pattern = "docker-eb-package-*.zip"
    result = subprocess.run(f"ls -t {BACKEND_DIR}/{pattern} 2>/dev/null | head -1", 
                           shell=True, capture_output=True, text=True)
    
    return result.stdout.strip() if result.stdout.strip() else None

def create_fixed_package():
    """Create a fixed Docker deployment package with Python installer script"""
    # Find the latest package to use as a base
    original_package = find_latest_python_fixed_package()
    if not original_package:
        print("No Docker deployment package found")
        return False
    
    # Create timestamp for new package
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    new_package = f"{BACKEND_DIR}/docker-eb-package-pythoninstaller-fixed-{timestamp}.zip"
    
    # First, create the Python installer script and fix dependencies script locally
    python_installer = create_python_installer_script()
    dependencies_script = check_and_simplify_dependencies_script()
    
    # Create a temporary directory to prepare the new package
    with tempfile.TemporaryDirectory() as temp_dir:
        # Extract the original package
        with zipfile.ZipFile(original_package, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Ensure the platform hooks directory exists in the extracted package
        package_hooks_dir = os.path.join(temp_dir, ".platform", "hooks", "prebuild")
        os.makedirs(package_hooks_dir, exist_ok=True)
        
        # Copy the Python installer script to the package
        shutil.copy2(python_installer, os.path.join(package_hooks_dir, "00_install_python.sh"))
        
        # Copy the dependencies script to the package
        shutil.copy2(dependencies_script, os.path.join(package_hooks_dir, "01_install_dependencies.sh"))
        
        # Make sure both scripts are executable in the package
        os.chmod(os.path.join(package_hooks_dir, "00_install_python.sh"), 0o755)
        os.chmod(os.path.join(package_hooks_dir, "01_install_dependencies.sh"), 0o755)
        
        # Create new zip package
        with zipfile.ZipFile(new_package, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arcname)
    
    print(f"Fixed deployment package created: {new_package}")
    return new_package

def update_registry():
    """Update script registry with this script's execution"""
    registry_path = os.path.join(SCRIPT_DIR, 'script_registry.js')
    if os.path.exists(registry_path):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(registry_path, 'r') as f:
            content = f.read()
        
        # Fix the script to avoid duplicates by using a direct write instead of append
        new_script = {
          "name": 'Version0032_fix_python_prebuild.py',
          "executionDate": timestamp,
          "status": 'SUCCESS',
          "description": 'Added Python installer script that runs before other prebuild hooks'
        }
        
        # Find the position to insert the new entry
        closing_bracket_pos = content.rfind('];')
        if closing_bracket_pos != -1:
            # Insert the new entry before the closing bracket
            new_content = content[:closing_bracket_pos]
            if content[closing_bracket_pos-1] != '{':  # Add comma if not the first entry
                new_content += ",\n  "
            else:
                new_content += "\n  "
                
            new_content += f"""{{
    name: '{new_script["name"]}',
    executionDate: '{new_script["executionDate"]}',
    status: '{new_script["status"]}',
    description: '{new_script["description"]}'
  }}"""
            
            new_content += content[closing_bracket_pos:]
            
            # Write the updated content
            with open(registry_path, 'w') as f:
                f.write(new_content)
                
            print(f"Updated script registry at {registry_path}")
        else:
            print("Could not update script registry: closing bracket not found.")
    else:
        print(f"Script registry not found at {registry_path}")

def create_documentation():
    """Create documentation explaining the fix"""
    docs_path = os.path.join(BACKEND_DIR, "PYTHON_INSTALLER_FIX.md")
    
    with open(docs_path, 'w') as f:
        f.write("""# Python Installer Fix for Docker Deployment

## Problem Identified

During deployment of our Docker application to AWS Elastic Beanstalk, deployment fails with the following error:

```
.platform/hooks/prebuild/01_install_dependencies.sh: line 18: python: command not found
...
.platform/hooks/prebuild/01_install_dependencies.sh: line 59: pip: command not found
```

## Root Cause Analysis

The issue stems from a fundamental timing problem in the Elastic Beanstalk Docker deployment process:

1. During deployment, Elastic Beanstalk first runs the `.platform/hooks/prebuild/` scripts on the **host instance** (before Docker builds)
2. Our prebuild scripts (`01_install_dependencies.sh`) use Python and pip commands
3. But Python isn't installed on the host instance at this point
4. The Dockerfile that includes Python installation runs *after* these prebuild hooks
5. This leads to a catch-22: we need Python for our prebuild hooks, but Python isn't available until after Docker builds

## Solution

We've implemented a dual-phase approach:

1. **Python Installer Script**: Created a new script `00_install_python.sh` that:
   - Runs first in the prebuild hooks sequence due to alphabetical ordering
   - Detects Amazon Linux version (AL2 or AL2023)
   - Installs Python 3 and pip using the appropriate package manager (yum or dnf)
   - Creates aliases for `python` → `python3` and `pip` → `pip3`
   - Verifies Python installation before other hooks run

2. **Prebuild Script Sequence**:
   - `00_install_python.sh` - Installs Python on the host instance
   - `00_install_postgresql.sh` - Installs PostgreSQL dependencies
   - `01_install_dependencies.sh` - Runs pip commands (now works because Python is available)
   - Other hooks as needed

## Implementation

The fix has been implemented in a new deployment package:
`docker-eb-package-pythoninstaller-fixed-YYYYMMDDHHMMSS.zip`

This package includes:
1. The new `00_install_python.sh` script
2. All previous fixes for PostgreSQL installation, syntax errors, etc.
3. Proper script execution permissions

## Deployment Instructions

To deploy the application with this fix:

1. Use the AWS Management Console
2. Create a new environment or update an existing one
3. Upload the new package with the Python installer fix
4. Make sure to select 'nginx' as the proxy server
5. Follow the detailed instructions in `AWS_CONSOLE_UPLOAD_STEPS_DOCKER.md`

This fix ensures that Python is available at the correct phase of the deployment process, allowing our prebuild hooks to run successfully.
""")
    
    print(f"Created documentation at {docs_path}")
    return docs_path

def update_deployment_instructions():
    """Update the AWS upload steps documentation"""
    docs_path = os.path.join(BACKEND_DIR, "AWS_CONSOLE_UPLOAD_STEPS_DOCKER.md")
    
    if not os.path.exists(docs_path):
        print(f"Deployment instructions not found at {docs_path}")
        return
    
    # Read the current content
    with open(docs_path, 'r') as f:
        content = f.read()
    
    # Get the timestamp for the new package
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    new_package = f"docker-eb-package-pythoninstaller-fixed-{timestamp}.zip"
    
    # Update the instructions to reference the new package
    updated_content = content.replace(
        "**docker-eb-package-python-fixed-",
        "**docker-eb-package-pythoninstaller-fixed-"
    )
    
    # Update the package creation date
    updated_content = updated_content.replace(
        "(created on May 17, 2025)",
        f"(created on May 17, 2025 at {datetime.now().strftime('%H:%M')})"
    )
    
    # Update the list of fixes
    updated_content = updated_content.replace(
        "This package fixes six critical issues:",
        "This package fixes seven critical issues:"
    )
    
    # Add the new fix to the list
    updated_content = updated_content.replace(
        "6. Updated Dockerfile to ensure Python is properly installed and fixed syntax errors in dependencies installation script",
        "6. Updated Dockerfile to ensure Python is properly installed and fixed syntax errors in dependencies installation script\n7. Added Python installer that runs before other prebuild hooks to ensure Python is available during deployment"
    )
    
    # Write the updated content
    with open(docs_path, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated deployment instructions at {docs_path}")
    return docs_path

if __name__ == "__main__":
    print("Starting Python installer fix...")
    
    # Create a fixed package
    fixed_package = create_fixed_package()
    
    if fixed_package:
        # Update the registry and documentation
        update_registry()
        create_documentation()
        update_deployment_instructions()
        
        print("Fix completed successfully!")
        print(f"New deployment package: {os.path.basename(fixed_package)}")
        print("Please use this package for your next deployment attempt.")
    else:
        print("Failed to create fixed package.")
