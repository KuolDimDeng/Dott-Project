#!/usr/bin/env python3
"""
Version0030_fix_postgresql_script_syntax.py

This script fixes a syntax error in the PostgreSQL installation shell script that was causing
Docker deployment to fail. The error was in the .platform/hooks/prebuild/00_install_postgresql.sh
file, where inline comments were causing a shell syntax error.

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

def fix_postgresql_script():
    """Fix the syntax error in the PostgreSQL installation script"""
    script_path = os.path.join(PLATFORM_HOOKS_DIR, "00_install_postgresql.sh")
    backup_path = f"{script_path}.backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Create a backup of the original file
    shutil.copy2(script_path, backup_path)
    print(f"Created backup of original script at {backup_path}")
    
    with open(script_path, 'r') as f:
        content = f.read()
    
    # Fix the problematic lines
    # These are the lines with syntax errors - inline comments inside if statement conditions
    content = content.replace(
        "if sudo dnf install -y libpq-devel # Replaced libpq-devel # Replaced postgresql-devel for AL2023 compatibility for AL2023 compatibility; then",
        "# Note: Replaced postgresql-devel with libpq-devel for AL2023 compatibility\nif sudo dnf install -y libpq-devel; then"
    )
    
    content = content.replace(
        "if sudo yum install -y libpq-devel # Replaced libpq-devel # Replaced postgresql-devel for AL2023 compatibility for AL2023 compatibility; then",
        "# Note: Replaced postgresql-devel with libpq-devel for AL2023 compatibility\nif sudo yum install -y libpq-devel; then"
    )
    
    # Write the fixed content back to the file
    with open(script_path, 'w') as f:
        f.write(content)
    
    print(f"Fixed syntax errors in {script_path}")
    
    # Make sure the script has execute permissions
    os.chmod(script_path, 0o755)
    print("Ensured script has executable permissions")
    
    return script_path

def find_latest_config_fixed_package():
    """Find the latest config-fixed docker deployment package"""
    pattern = "docker-eb-package-config-fixed-*.zip"
    result = subprocess.run(f"ls -t {BACKEND_DIR}/{pattern} 2>/dev/null | head -1", 
                           shell=True, capture_output=True, text=True)
    
    if result.stdout.strip():
        return result.stdout.strip()
    
    # If no config-fixed package exists, try port-fixed ones    
    pattern = "docker-eb-package-port-fixed-*.zip"
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
    """Create a fixed Docker deployment package with corrected PostgreSQL script"""
    # Find the latest package to use as a base
    original_package = find_latest_config_fixed_package()
    if not original_package:
        print("No Docker deployment package found")
        return False
    
    # Create timestamp for new package
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    new_package = f"{BACKEND_DIR}/docker-eb-package-script-fixed-{timestamp}.zip"
    
    # First, fix the PostgreSQL script locally
    fixed_script = fix_postgresql_script()
    
    # Create a temporary directory to prepare the new package
    with tempfile.TemporaryDirectory() as temp_dir:
        # Extract the original package
        with zipfile.ZipFile(original_package, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Ensure the platform hooks directory exists in the extracted package
        package_hooks_dir = os.path.join(temp_dir, ".platform", "hooks", "prebuild")
        os.makedirs(package_hooks_dir, exist_ok=True)
        
        # Copy the fixed script to the package
        shutil.copy2(fixed_script, os.path.join(package_hooks_dir, "00_install_postgresql.sh"))
        
        # Make sure it's executable in the package
        os.chmod(os.path.join(package_hooks_dir, "00_install_postgresql.sh"), 0o755)
        
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
          "name": 'Version0030_fix_postgresql_script_syntax.py',
          "executionDate": timestamp,
          "status": 'SUCCESS',
          "description": 'Fixed shell script syntax error in PostgreSQL installation script that was causing deployment failure'
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
    docs_path = os.path.join(BACKEND_DIR, "POSTGRESQL_SCRIPT_SYNTAX_FIX.md")
    
    with open(docs_path, 'w') as f:
        f.write("""# PostgreSQL Script Syntax Fix

## Problem Identified

During deployment of our Docker application to AWS Elastic Beanstalk, the following error occurred:

```
ERROR: An error occurred during execution of command [app-deploy] - [RunAppDeployPreBuildHooks]. 
Stop running the command. Error: Command .platform/hooks/prebuild/00_install_postgresql.sh failed with error exit status 2.
Stderr:.platform/hooks/prebuild/00_install_postgresql.sh: line 47: syntax error near unexpected token `fi'
```

## Root Cause

The shell script `.platform/hooks/prebuild/00_install_postgresql.sh` contained inline comments within if statement conditions, breaking the shell syntax:

```bash
# Problematic code - comments inside the if condition:
if sudo dnf install -y libpq-devel # Replaced libpq-devel # Replaced postgresql-devel for AL2023 compatibility for AL2023 compatibility; then
    echo "Successfully installed postgresql-devel"
    return 0
fi
```

Shell scripting syntax doesn't allow inline comments within command conditionals like this. The `#` character and everything after it is treated as a comment, but in this context it breaks the if statement structure.

## Solution

The fix was to move the comments to their own lines before the if statement:

```bash
# Note: Replaced postgresql-devel with libpq-devel for AL2023 compatibility
if sudo dnf install -y libpq-devel; then
    echo "Successfully installed postgresql-devel"
    return 0
fi
```

This preserves the comments while maintaining proper shell script syntax.

## Implementation

1. Created a backup of the original script
2. Fixed the syntax errors in two places:
   - In the AL2023 installation section (around line 47)
   - In the AL2 installation section (around line 71)
3. Created a new deployment package with the fixed script
4. Updated the documentation to reference the new package

## New Deployment Package

A new fixed deployment package has been created:
`docker-eb-package-script-fixed-YYYYMMDDHHMMSS.zip`

This package maintains all previous fixes while also addressing the PostgreSQL script syntax error.

## Deployment Instructions

To deploy the application with this fix, follow the standard deployment process but use the latest fixed package:

1. Use the AWS Management Console
2. Create a new environment or update an existing one
3. Upload the package with the fixed PostgreSQL script
4. Make sure to select 'nginx' as the proxy server
5. Follow the detailed instructions in `AWS_CONSOLE_UPLOAD_STEPS_DOCKER.md`

This fix ensures the PostgreSQL installation pre-build hook runs correctly during deployment.
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
    new_package = f"docker-eb-package-script-fixed-{timestamp}.zip"
    
    # Update the instructions to reference the new package
    updated_content = content.replace(
        "## Important: Use the Fixed Deployment Package",
        "## Important: Use the Fixed Deployment Package"
    )
    
    updated_content = updated_content.replace(
        "**docker-eb-package-config-fixed-20250517093837.zip** (created on May 17, 2025)",
        f"**{new_package}** (created on May 17, 2025)"
    )
    
    updated_content = updated_content.replace(
        "This package fixes four critical configuration issues:",
        "This package fixes five critical issues:"
    )
    
    updated_content = updated_content.replace(
        "4. Removed unsupported WSGI parameters (`WSGIPath`, `NumProcesses`, `NumThreads`) that are not compatible with Docker platform",
        "4. Removed unsupported WSGI parameters (`WSGIPath`, `NumProcesses`, `NumThreads`) that are not compatible with Docker platform\n5. Fixed shell script syntax error in PostgreSQL installation script that was causing deployment failure"
    )
    
    updated_content = updated_content.replace(
        "- Choose the file: **docker-eb-package-config-fixed-20250517093837.zip**",
        f"- Choose the file: **{new_package}**"
    )
    
    # Write the updated content
    with open(docs_path, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated deployment instructions at {docs_path}")
    return docs_path

if __name__ == "__main__":
    print("Starting PostgreSQL script syntax fix...")
    
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
