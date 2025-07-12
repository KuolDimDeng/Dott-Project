#!/usr/bin/env python3
"""
Version0031_fix_docker_python_setup.py

This script addresses two issues in the Docker deployment:
1. Fixes syntax errors in the 01_install_dependencies.sh script similar to those fixed in 00_install_postgresql.sh
2. Updates the Dockerfile to ensure Python and pip are properly installed in the Docker environment

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

def fix_dependencies_script():
    """Fix the syntax errors in the dependencies installation script"""
    script_path = os.path.join(PLATFORM_HOOKS_DIR, "01_install_dependencies.sh")
    backup_path = f"{script_path}.backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Create a backup of the original file
    shutil.copy2(script_path, backup_path)
    print(f"Created backup of original script at {backup_path}")
    
    with open(script_path, 'r') as f:
        content = f.read()
    
    # Fix the problematic lines
    # These are the lines with syntax errors - inline comments inside if statement conditions
    content = content.replace(
        "if ! sudo yum install -y libpq-devel # Replaced libpq-devel # Replaced postgresql-devel for AL2023 compatibility for AL2023 compatibility; then",
        "# Note: Replaced postgresql-devel with libpq-devel for AL2023 compatibility\nif ! sudo yum install -y libpq-devel; then"
    )
    
    content = content.replace(
        "yum list installed | grep -qw postgresql-devel || sudo yum install -y libpq-devel # Replaced libpq-devel # Replaced postgresql-devel for AL2023 compatibility for AL2023 compatibility",
        "# Note: Replaced postgresql-devel with libpq-devel for AL2023 compatibility\nyum list installed | grep -qw postgresql-devel || sudo yum install -y libpq-devel"
    )
    
    # Write the fixed content back to the file
    with open(script_path, 'w') as f:
        f.write(content)
    
    print(f"Fixed syntax errors in {script_path}")
    
    # Make sure the script has execute permissions
    os.chmod(script_path, 0o755)
    print("Ensured script has executable permissions")
    
    return script_path

def update_dockerfile():
    """Update the Dockerfile to ensure Python and pip are installed"""
    dockerfile_path = os.path.join(BACKEND_DIR, "Dockerfile")
    backup_path = f"{dockerfile_path}.backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Create a backup of the original file
    shutil.copy2(dockerfile_path, backup_path)
    print(f"Created backup of original Dockerfile at {backup_path}")
    
    with open(dockerfile_path, 'r') as f:
        content = f.read()
    
    # Check if the Dockerfile already has Python installation
    if "python" not in content.lower() or "pip" not in content.lower():
        # This is a basic update to ensure Python is installed
        improved_dockerfile = """# Base image for Python application on Amazon Linux 2023
FROM public.ecr.aws/amazonlinux/amazonlinux:2023

# Install system dependencies
RUN dnf update -y && \\
    dnf install -y python3 python3-pip python3-devel gcc libpq-devel \\
    which findutils tar gzip curl git && \\
    dnf clean all && \\
    alternatives --install /usr/bin/python python /usr/bin/python3 1 && \\
    alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

# Create app directory
WORKDIR /app

# Copy requirements file and install dependencies
COPY requirements-eb.txt /app/
RUN pip install --no-cache-dir -r requirements-eb.txt

# Copy application files
COPY . /app/

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Expose the application port
EXPOSE 8080

# Launch application
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "application"]
"""
        # Write the improved Dockerfile
        with open(dockerfile_path, 'w') as f:
            f.write(improved_dockerfile)
        
        print(f"Updated Dockerfile with Python installation")
    else:
        print("Dockerfile already has Python installation, no changes needed")
    
    return dockerfile_path

def find_latest_script_fixed_package():
    """Find the latest script-fixed docker deployment package"""
    pattern = "docker-eb-package-script-fixed-*.zip"
    result = subprocess.run(f"ls -t {BACKEND_DIR}/{pattern} 2>/dev/null | head -1", 
                           shell=True, capture_output=True, text=True)
    
    if result.stdout.strip():
        return result.stdout.strip()
    
    # If no script-fixed package exists, try config-fixed ones    
    pattern = "docker-eb-package-config-fixed-*.zip"
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
    """Create a fixed Docker deployment package with Python setup and fixed script"""
    # Find the latest package to use as a base
    original_package = find_latest_script_fixed_package()
    if not original_package:
        print("No Docker deployment package found")
        return False
    
    # Create timestamp for new package
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    new_package = f"{BACKEND_DIR}/docker-eb-package-python-fixed-{timestamp}.zip"
    
    # First, fix the dependencies script and Dockerfile locally
    fixed_script = fix_dependencies_script()
    updated_dockerfile = update_dockerfile()
    
    # Create a temporary directory to prepare the new package
    with tempfile.TemporaryDirectory() as temp_dir:
        # Extract the original package
        with zipfile.ZipFile(original_package, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Ensure the platform hooks directory exists in the extracted package
        package_hooks_dir = os.path.join(temp_dir, ".platform", "hooks", "prebuild")
        os.makedirs(package_hooks_dir, exist_ok=True)
        
        # Copy the fixed script to the package
        shutil.copy2(fixed_script, os.path.join(package_hooks_dir, "01_install_dependencies.sh"))
        
        # Copy the updated Dockerfile to the package
        shutil.copy2(updated_dockerfile, os.path.join(temp_dir, "Dockerfile"))
        
        # Make sure the script is executable in the package
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
          "name": 'Version0031_fix_docker_python_setup.py',
          "executionDate": timestamp,
          "status": 'SUCCESS',
          "description": 'Fixed dependencies script syntax error and updated Dockerfile to ensure Python is installed'
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
    docs_path = os.path.join(BACKEND_DIR, "DOCKER_PYTHON_SETUP_FIX.md")
    
    with open(docs_path, 'w') as f:
        f.write("""# Docker Python Setup Fix

## Problem Identified

During deployment of our Docker application to AWS Elastic Beanstalk, the following error occurred:

```
ERROR: Command .platform/hooks/prebuild/01_install_dependencies.sh failed with error exit status 127.
Stderr:+ exec
++ tee -a /var/log/eb-prebuild.log
```

Examining the logs revealed two issues:
```
.platform/hooks/prebuild/01_install_dependencies.sh: line 18: python: command not found
...
.platform/hooks/prebuild/01_install_dependencies.sh: line 59: pip: command not found
```

## Root Causes

1. **Missing Python in Docker Environment**: The Docker container didn't have Python and pip installed, which are required for the deployment process.

2. **Shell Script Syntax Errors**: Similar to the PostgreSQL script error we fixed previously, the `01_install_dependencies.sh` script also contained shell syntax errors with inline comments inside if statements:

```bash
# Problematic code - comments inside the if condition:
if ! sudo yum install -y libpq-devel # Replaced libpq-devel # Replaced postgresql-devel for AL2023 compatibility for AL2023 compatibility; then
    # ...
fi
```

## Solution

1. **Improved Dockerfile**:
   - Added explicit installation of Python 3 and pip in the Dockerfile
   - Created alternatives symlinks for python and pip commands
   - Added proper system dependencies needed for Python packages

2. **Fixed Dependencies Script**:
   - Moved inline comments to their own lines
   - Fixed shell syntax errors in the if statements
   - Ensured script has proper execute permissions

## Implementation

1. Created backup copies of the original Dockerfile and dependencies script
2. Updated the Dockerfile to include Python installation
3. Fixed syntax errors in the dependencies script
4. Created a new deployment package with both fixes

## New Deployment Package

A new fixed deployment package has been created:
`docker-eb-package-python-fixed-YYYYMMDDHHMMSS.zip`

This package contains:
1. The fixed PostgreSQL script from our previous fix
2. The fixed dependencies script with proper shell syntax
3. An improved Dockerfile that properly installs Python and pip
4. All other previous fixes

## Deployment Instructions

To deploy the application with this fix:

1. Use the AWS Management Console
2. Create a new environment or update an existing one
3. Upload the package with the Docker Python setup fix
4. Make sure to select 'nginx' as the proxy server
5. Follow the detailed instructions in `AWS_CONSOLE_UPLOAD_STEPS_DOCKER.md`

This fix ensures that Python is properly available in the Docker environment and the dependencies script runs correctly during deployment.
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
    new_package = f"docker-eb-package-python-fixed-{timestamp}.zip"
    
    # Update the instructions to reference the new package
    updated_content = content.replace(
        "## Important: Use the Fixed Deployment Package",
        "## Important: Use the Fixed Deployment Package"
    )
    
    # Replace the old package name with the new one
    if "docker-eb-package-script-fixed-" in content:
        old_package = content.split("**docker-eb-package-script-fixed-")[1].split("**")[0]
        updated_content = updated_content.replace(
            f"**docker-eb-package-script-fixed-{old_package}**",
            f"**{new_package}** (created on May 17, 2025)"
        )
    else:
        # Fallback if the exact package name can't be found
        updated_content = updated_content.replace(
            "This package fixes five critical issues:",
            f"**{new_package}** (created on May 17, 2025)\n\nThis package fixes six critical issues:"
        )
    
    # Update the list of fixes
    updated_content = updated_content.replace(
        "This package fixes five critical issues:",
        "This package fixes six critical issues:"
    )
    
    # Add the new fix to the list
    updated_content = updated_content.replace(
        "5. Fixed shell script syntax error in PostgreSQL installation script that was causing deployment failure",
        "5. Fixed shell script syntax error in PostgreSQL installation script that was causing deployment failure\n6. Updated Dockerfile to ensure Python is properly installed and fixed syntax errors in dependencies installation script"
    )
    
    # Update the file reference
    if "- Choose the file: **docker-eb-package-script-fixed-" in updated_content:
        updated_content = updated_content.replace(
            f"- Choose the file: **docker-eb-package-script-fixed-{old_package}**",
            f"- Choose the file: **{new_package}**"
        )
    
    # Write the updated content
    with open(docs_path, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated deployment instructions at {docs_path}")
    return docs_path

if __name__ == "__main__":
    print("Starting Docker Python setup fix...")
    
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
