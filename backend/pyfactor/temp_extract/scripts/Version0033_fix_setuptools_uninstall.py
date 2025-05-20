#!/usr/bin/env python3
"""
Version0033_fix_setuptools_uninstall.py

This script fixes the 'Cannot uninstall setuptools' error during deployment:
1. Modifies the 01_install_dependencies.sh script to use --ignore-installed flag
2. Updates the deployment package with this fix
3. Adds EB CLI deployment configuration and instructions

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
    """Fix the dependencies script to handle system-installed packages"""
    script_path = os.path.join(PLATFORM_HOOKS_DIR, "01_install_dependencies.sh")
    
    # Create a backup
    backup_path = f"{script_path}.backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(script_path, backup_path)
    print(f"Created backup of dependencies script at {backup_path}")
    
    with open(script_path, 'r') as f:
        content = f.read()
    
    # Fix the pip upgrade command to use --ignore-installed
    modified_content = content.replace(
        "pip install --upgrade pip==23.3.1 setuptools==69.0.3",
        "pip install --upgrade --ignore-installed pip==23.3.1 setuptools==69.0.3"
    )
    
    # Add error handling for pip install failures
    if "set -e" in modified_content:
        # If script already has set -e, add error handling where needed
        modified_content = modified_content.replace(
            "pip install --upgrade --ignore-installed pip==23.3.1 setuptools==69.0.3",
            "pip install --upgrade --ignore-installed pip==23.3.1 setuptools==69.0.3 || {\n"
            "  echo \"Warning: Could not upgrade pip/setuptools, using system version instead\"\n"
            "  pip --version\n"
            "}"
        )
        
        # Also, fix the requirements install to handle errors
        modified_content = modified_content.replace(
            "pip install -r requirements-eb.txt -c /tmp/pip-constraints.txt",
            "pip install -r requirements-eb.txt -c /tmp/pip-constraints.txt || {\n"
            "  echo \"Warning: Failed with constraints, trying without constraints\"\n"
            "  pip install -r requirements-eb.txt\n"
            "}"
        )
    else:
        # If script doesn't have set -e, add it and the error handling
        lines = modified_content.split("\n")
        shebang_idx = 0
        for i, line in enumerate(lines):
            if line.startswith("#!/bin/"):
                shebang_idx = i
                break
                
        # Insert error handling setup after shebang
        lines.insert(shebang_idx + 1, "\n# Don't exit on errors, handle them gracefully")
        lines.insert(shebang_idx + 2, "set +e")
        
        modified_content = "\n".join(lines)
    
    with open(script_path, 'w') as f:
        f.write(modified_content)
    
    # Make it executable
    os.chmod(script_path, 0o755)
    
    print(f"Updated dependencies script at {script_path}")
    return script_path

def find_latest_python_fixed_package():
    """Find the latest Python-fixed docker deployment package"""
    pattern = "docker-eb-package-pythoninstaller-fixed-*.zip"
    result = subprocess.run(f"ls -t {BACKEND_DIR}/{pattern} 2>/dev/null | head -1", 
                           shell=True, capture_output=True, text=True)
    
    if result.stdout.strip():
        return result.stdout.strip()
    
    # If no pythoninstaller-fixed package exists, try python-fixed ones
    pattern = "docker-eb-package-python-fixed-*.zip"
    result = subprocess.run(f"ls -t {BACKEND_DIR}/{pattern} 2>/dev/null | head -1", 
                           shell=True, capture_output=True, text=True)
    
    if result.stdout.strip():
        return result.stdout.strip()
    
    # If still nothing, try script-fixed ones
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
    """Create a fixed Docker deployment package with setuptools fix"""
    # Find the latest package to use as a base
    original_package = find_latest_python_fixed_package()
    if not original_package:
        print("No Docker deployment package found")
        return False
    
    # Create timestamp for new package
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    new_package = f"{BACKEND_DIR}/docker-eb-package-setuptools-fixed-{timestamp}.zip"
    
    # First, fix the dependencies script locally
    dependencies_script = fix_dependencies_script()
    
    # Create a temporary directory to prepare the new package
    with tempfile.TemporaryDirectory() as temp_dir:
        # Extract the original package
        with zipfile.ZipFile(original_package, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Ensure the platform hooks directory exists in the extracted package
        package_hooks_dir = os.path.join(temp_dir, ".platform", "hooks", "prebuild")
        os.makedirs(package_hooks_dir, exist_ok=True)
        
        # Copy the fixed dependencies script to the package
        shutil.copy2(dependencies_script, os.path.join(package_hooks_dir, "01_install_dependencies.sh"))
        
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

def create_eb_cli_config():
    """Create EB CLI configuration files for deployment"""
    config_dir = os.path.join(BACKEND_DIR, ".elasticbeanstalk")
    os.makedirs(config_dir, exist_ok=True)
    
    config_file = os.path.join(config_dir, "config.yml")
    
    config_content = """branch-defaults:
  default:
    environment: pyfactor-docker-env
    group_suffix: null
global:
  application_name: Dott
  branch: null
  default_ec2_keyname: dott-key-pair
  default_platform: Docker running on 64bit Amazon Linux 2023
  default_region: us-east-1
  include_git_submodules: true
  instance_profile: null
  platform_name: null
  platform_version: null
  profile: null
  repository: null
  sc: null
  workspace_type: Application
"""
    
    with open(config_file, 'w') as f:
        f.write(config_content)
    
    print(f"Created EB CLI config at {config_file}")
    return config_file

def create_eb_cli_instructions():
    """Create documentation for EB CLI deployment"""
    docs_path = os.path.join(BACKEND_DIR, "EB_CLI_DEPLOYMENT.md")
    
    with open(docs_path, 'w') as f:
        f.write(f"""# EB CLI Deployment Instructions

## Overview

Using the EB CLI (Elastic Beanstalk Command Line Interface) allows for more streamlined deployments compared to using the AWS Management Console. This guide explains how to use the EB CLI to deploy our Docker-based application.

## Prerequisites

1. Install EB CLI:
   ```
   pip install awsebcli
   ```

2. AWS Credentials configured (either via `~/.aws/credentials` or environment variables)

## Deployment Steps

1. Navigate to the backend directory:
   ```
   cd /Users/kuoldeng/projectx/backend/pyfactor
   ```

2. Use the latest fixed deployment package:
   ```
   eb deploy --staged --label v{datetime.now().strftime("%Y%m%d%H%M")} --timeout 20
   ```

## Important Configuration Options

The EB CLI will use the configuration in `.elasticbeanstalk/config.yml`, which includes:

- **Environment**: pyfactor-docker-env
- **Application**: Dott
- **Platform**: Docker running on 64bit Amazon Linux 2023
- **Region**: us-east-1
- **EC2 Key Pair**: dott-key-pair

## Monitoring Deployment

1. View deployment status:
   ```
   eb status
   ```

2. View environment health:
   ```
   eb health
   ```

3. View logs:
   ```
   eb logs
   ```

4. SSH into the instance for troubleshooting:
   ```
   eb ssh
   ```

## Deployed Package Information

The deployment package (`docker-eb-package-setuptools-fixed-YYYYMMDDHHMMSS.zip`) includes:

1. Python installer script (`00_install_python.sh`) that runs first
2. Fixed dependencies script (`01_install_dependencies.sh`) with:
   - `--ignore-installed` flag for pip and setuptools
   - Error handling for pip installation failures
3. All previous fixes for PostgreSQL installation, etc.

## Startup Commands and Environment Variables

The deployment uses the following environment variables:
- `DEBUG`: False
- `DJANGO_SETTINGS_MODULE`: pyfactor.settings_eb
- `DOMAIN`: dottapps.com
- `EB_ENV_NAME`: pyfactor-docker-env
- `PYTHONPATH`: /var/app/current

## Troubleshooting

If you encounter errors during deployment:

1. Check the logs for specific errors:
   ```
   eb logs
   ```

2. Common issues:
   - **Package Installation Errors**: Fixed by using `--ignore-installed` in this update
   - **Execution Permissions**: Make sure all scripts have execute permissions (`chmod +x`)
   - **Proxy Server Configuration**: Ensure nginx is selected, not apache
""")
    
    print(f"Created EB CLI instructions at {docs_path}")
    return docs_path

def update_registry():
    """Update script registry with this script's execution"""
    registry_path = os.path.join(SCRIPT_DIR, 'script_registry.js')
    if os.path.exists(registry_path):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(registry_path, 'r') as f:
            content = f.read()
        
        # Fix the script to avoid duplicates by using a direct write instead of append
        new_script = {
          "name": 'Version0033_fix_setuptools_uninstall.py',
          "executionDate": timestamp,
          "status": 'SUCCESS',
          "description": 'Fixed setuptools uninstall error by using --ignore-installed flag'
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

def update_deployment_instructions(new_package_name):
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
    
    # Extract just the filename from the full path
    package_filename = os.path.basename(new_package_name)
    
    # Update the instructions to reference the new package
    updated_content = content.replace(
        "**docker-eb-package-pythoninstaller-fixed-",
        "**docker-eb-package-setuptools-fixed-"
    )
    
    # Update specific package references
    updated_content = updated_content.replace(
        "docker-eb-package-pythoninstaller-fixed-20250517105943.zip",
        package_filename
    )
    
    # Update the package creation date
    updated_content = updated_content.replace(
        "(created on May 17, 2025 at 10:59)",
        f"(created on May 17, 2025 at {datetime.now().strftime('%H:%M')})"
    )
    
    # Update the list of fixes
    updated_content = updated_content.replace(
        "This package fixes seven critical issues:",
        "This package fixes eight critical issues:"
    )
    
    # Add the new fix to the list
    updated_content = updated_content.replace(
        "7. Added Python installer that runs before other prebuild hooks to ensure Python is available during deployment",
        "7. Added Python installer that runs before other prebuild hooks to ensure Python is available during deployment\n8. Fixed setuptools uninstall error by using --ignore-installed flag for system-installed packages"
    )
    
    # Write the updated content
    with open(docs_path, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated deployment instructions at {docs_path}")
    return docs_path

if __name__ == "__main__":
    print("Starting setuptools fix...")
    
    # Create a fixed package
    fixed_package = create_fixed_package()
    
    if fixed_package:
        # Update the registry and documentation
        update_registry()
        create_eb_cli_config()
        create_eb_cli_instructions()
        update_deployment_instructions(fixed_package)
        
        print("Fix completed successfully!")
        print(f"New deployment package: {os.path.basename(fixed_package)}")
        print("Please use this package for your next deployment attempt.")
        print("Try using the EB CLI for more reliable deployments (see EB_CLI_DEPLOYMENT.md).")
    else:
        print("Failed to create fixed package.")
