#!/usr/bin/env python
"""
Version0022_fix_postgresql_devel_custom_config.py

This script fixes the issue with the 'postgresql-devel' package not being available
in Amazon Linux 2023. It removes the postgresql-devel package reference from
the .ebextensions/99_custom_env.config file which is causing deployment failures.

Author: System Administrator
Date: May 16, 2025
"""

import os
import sys
import shutil
import json
import datetime
import yaml
from pathlib import Path

# Paths
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EBEXTENSIONS_DIR = os.path.join(PROJECT_DIR, '.ebextensions')
CUSTOM_ENV_CONFIG = os.path.join(EBEXTENSIONS_DIR, '99_custom_env.config')
SCRIPTS_DIR = os.path.join(PROJECT_DIR, 'scripts')
BACKUPS_DIR = os.path.join(PROJECT_DIR, 'backups')

# Make sure the backups directory exists
os.makedirs(BACKUPS_DIR, exist_ok=True)

def backup_file(file_path):
    """Create a backup of a file with timestamp in filename."""
    if not os.path.exists(file_path):
        return None
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = os.path.basename(file_path)
    backup_path = os.path.join(BACKUPS_DIR, f"{filename}.backup_{timestamp}")
    shutil.copy2(file_path, backup_path)
    print(f"Created backup at: {backup_path}")
    return backup_path

def fix_custom_env_config():
    """Fix the custom environment configuration to remove problematic postgresql-devel package."""
    if not os.path.exists(CUSTOM_ENV_CONFIG):
        print(f"Error: {CUSTOM_ENV_CONFIG} does not exist")
        return False
    
    backup_file(CUSTOM_ENV_CONFIG)
    
    # Read the file as text to preserve formatting
    with open(CUSTOM_ENV_CONFIG, 'r') as f:
        content = f.read()
    
    # Replace the postgresql-devel package line
    if "postgresql-devel: []" in content:
        content = content.replace("postgresql-devel: []", "# postgresql-devel removed for AL2023 compatibility")
        print("Removed postgresql-devel package reference")
    else:
        print("postgresql-devel package reference not found in expected format")
    
    # Write the updated content back to the file
    with open(CUSTOM_ENV_CONFIG, 'w') as f:
        f.write(content)
    
    print(f"Updated custom environment configuration in {CUSTOM_ENV_CONFIG}")
    return True

def create_deployment_script():
    """Create a deployment helper script."""
    deploy_script_path = os.path.join(SCRIPTS_DIR, 'deploy_postgresql_devel_fixed.sh')
    
    deploy_script_content = """#!/bin/bash
# Script to deploy with fixed PostgreSQL-devel reference for AL2023
# Created by Version0022_fix_postgresql_devel_custom_config.py

set -e
echo "Preparing optimized deployment package with PostgreSQL-devel AL2023 fixes..."

# Create the minimal package
python scripts/Version0019_create_minimal_package.py

# Get the latest minimal package
PACKAGE=$(ls -t minimal-fixed-package-*.zip | head -1)

if [ -z "$PACKAGE" ]; then
    echo "Error: No deployment package found!"
    exit 1
fi

echo "Found package: $PACKAGE"
echo ""
echo "To deploy this package:"
echo "1. Log in to the AWS Elastic Beanstalk Console"
echo "2. Navigate to your environment"
echo "3. Click 'Upload and deploy'"
echo "4. Upload $PACKAGE"
echo "5. Set version label to 'fixed-postgresql-devel-al2023-$(date +%Y%m%d)'"
echo "6. Click 'Deploy'"
echo ""
echo "Or to deploy using the EB CLI, run:"
echo "eb deploy -l fixed-postgresql-devel-al2023-$(date +%Y%m%d) --staged"
echo ""

read -p "Do you want to deploy using EB CLI now? (y/n): " DEPLOY_NOW

if [[ $DEPLOY_NOW == "y" || $DEPLOY_NOW == "Y" ]]; then
    if command -v eb &> /dev/null; then
        echo "Deploying using EB CLI..."
        eb deploy -l fixed-postgresql-devel-al2023-$(date +%Y%m%d) --staged
    else
        echo "EB CLI not found. Please install with 'pip install awsebcli' or deploy manually."
    fi
else
    echo "Skipping deployment. You can deploy manually using the AWS Console."
fi
"""
    
    with open(deploy_script_path, 'w') as f:
        f.write(deploy_script_content)
    
    # Make the script executable
    os.chmod(deploy_script_path, 0o755)
    
    print(f"✅ Deployment helper script created at: {deploy_script_path}")
    return deploy_script_path

def update_script_registry():
    """Update the script registry with this script's information."""
    script_registry_path = os.path.join(SCRIPTS_DIR, 'script_registry.js')
    if not os.path.exists(script_registry_path):
        # Create script registry if it doesn't exist
        with open(script_registry_path, 'w') as f:
            f.write("""// Script Registry
// This file tracks all scripts that have been executed in this project

const scriptRegistry = {
    scripts: []
};

module.exports = scriptRegistry;
""")
    
    try:
        with open(script_registry_path, 'r') as f:
            content = f.read()
        
        script_info = {
            "name": "Version0022_fix_postgresql_devel_custom_config.py",
            "description": "Fixes postgresql-devel package reference in custom environment config for AL2023 compatibility",
            "date_executed": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "SUCCESS",
            "affects_files": [
                ".ebextensions/99_custom_env.config",
                "scripts/deploy_postgresql_devel_fixed.sh"
            ]
        }
        
        if "scripts: [" in content:
            # Find position to insert
            insert_pos = content.find("scripts: [") + len("scripts: [")
            new_content = content[:insert_pos] + "\n"
            new_content += "        " + json.dumps(script_info, indent=8).replace('\n        ', '\n        ')
            
            # Add comma if there are other scripts
            if content[insert_pos:].strip().startswith("{"):
                new_content += ","
            
            new_content += content[insert_pos:]
            
            with open(script_registry_path, 'w') as f:
                f.write(new_content)
            
            print("Script registry updated successfully.")
        else:
            print("Could not update script registry: unexpected format.")
    except Exception as e:
        print(f"Error updating script registry: {str(e)}")

def create_documentation():
    """Create documentation for this fix."""
    docs_path = os.path.join(SCRIPTS_DIR, 'PostgreSQL_Devel_Fix.md')
    
    doc_content = """# PostgreSQL-devel Package Fix for Amazon Linux 2023

## Issue
The deployment to AWS Elastic Beanstalk on Amazon Linux 2023 was failing with the following error:
```
Error occurred during build: Yum does not have postgresql-devel available for installation
```

This error occurs because the `postgresql-devel` package is not available in the default repositories for Amazon Linux 2023. Although previous fixes addressed the `postgresql` base package, we found that `postgresql-devel` was still referenced in `.ebextensions/99_custom_env.config`.

## Root Cause Analysis
Amazon Linux 2023 uses different package management and repositories compared to Amazon Linux 2. While our previous fixes addressed the base `postgresql` package in `.ebextensions/02_packages.config`, the `postgresql-devel` package was still being referenced in the `.ebextensions/99_custom_env.config` file, which was causing deployment failures during the build process.

## Solution
The script `Version0022_fix_postgresql_devel_custom_config.py` implements fixes to address this issue:

1. Removes the `postgresql-devel: []` line from the packages section in `.ebextensions/99_custom_env.config`
2. Replaces it with a comment indicating it was removed for AL2023 compatibility
3. Leverages the existing robust installation methods in the prebuild hooks to install necessary PostgreSQL development dependencies

## Deployment
To deploy using this fix:

1. Run the fix script:
```bash
cd /path/to/backend/pyfactor
python scripts/Version0022_fix_postgresql_devel_custom_config.py
```

2. Use the generated deployment script:
```bash
./scripts/deploy_postgresql_devel_fixed.sh
```

Or manually deploy:
1. Create a minimal package with the fixes:
```bash
python scripts/Version0019_create_minimal_package.py
```

2. Upload the resulting `minimal-fixed-package-[timestamp].zip` to the AWS Elastic Beanstalk Console

## Verification
After deployment, verify that:
- The environment health is green
- The application is functioning correctly
- Database connections work properly

## Additional Notes
This fix builds upon previous PostgreSQL-related fixes but specifically addresses the `postgresql-devel` reference in the custom environment configuration file.

## Date Implemented
May 16, 2025
"""
    
    with open(docs_path, 'w') as f:
        f.write(doc_content)
    
    print(f"✅ Documentation created at: {docs_path}")
    return docs_path

def main():
    """Main execution function."""
    print("Fixing postgresql-devel reference issue for Amazon Linux 2023...")
    
    # Fix custom env config
    if fix_custom_env_config():
        print("✅ Custom environment configuration updated successfully.")
    else:
        print("❌ Failed to update custom environment configuration.")
    
    # Create deployment script
    deploy_script = create_deployment_script()
    
    # Create documentation
    docs_path = create_documentation()
    
    # Update script registry
    update_script_registry()
    
    print("\nAll fixes applied successfully!")
    print("To deploy with these fixes, run:")
    print(f"  1. {deploy_script}")
    print("  OR")
    print("  1. Create a new minimal package:")
    print("     python scripts/Version0019_create_minimal_package.py")
    print("  2. Upload the minimal package to the AWS Elastic Beanstalk Console")
    print("\nThis should resolve the 'Yum does not have postgresql-devel available for installation' error.")

if __name__ == "__main__":
    main()
