#!/usr/bin/env python
"""
Version0024_update_deployment_guide.py

This script creates a consolidated deployment guide that incorporates all 
the PostgreSQL fixes we've developed to resolve the AL2023 deployment issues.
It provides clear instructions for deploying the application to AWS Elastic Beanstalk
with all the necessary fixes in place.

Author: System Administrator
Date: May 17, 2025
"""

import os
import sys
import json
import datetime
import shutil
from pathlib import Path

# Paths
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(PROJECT_DIR, 'scripts')
DOCS_DIR = PROJECT_DIR

def create_deployment_guide():
    """Create a comprehensive deployment guide."""
    guide_path = os.path.join(DOCS_DIR, 'COMPREHENSIVE_DEPLOYMENT_GUIDE.md')
    
    guide_content = """# Comprehensive AWS Elastic Beanstalk Deployment Guide

## Overview
This guide consolidates all fixes developed to address deployment issues with AWS Elastic Beanstalk on Amazon Linux 2023, with a particular focus on PostgreSQL compatibility issues and Python bytecode file handling.

## Prerequisites
- AWS CLI installed and configured
- Elastic Beanstalk CLI (eb cli) installed (`pip install awsebcli`)
- Access to AWS Elastic Beanstalk console
- An existing Elastic Beanstalk application

## Step 1: Apply All Fixes

We've developed multiple scripts to address various deployment issues. The comprehensive fix script applies all necessary changes:

```bash
cd /path/to/backend/pyfactor
python scripts/Version0023_fix_prebuild_postgresql_devel.py
```

This comprehensive script:
1. Searches for and fixes all postgresql-devel references across configuration files
2. Adds a robust prebuild hook for PostgreSQL compatibility on AL2023
3. Creates symlinks to ensure backward compatibility
4. Fixes any custom build configurations causing issues

## Step 2: Create Minimal Deployment Package

The minimal package includes only files necessary for deployment, reducing package size and avoiding common deployment pitfalls:

```bash
cd /path/to/backend/pyfactor
python scripts/Version0019_create_minimal_package.py
```

This script:
1. Creates a streamlined package with only essential files
2. Applies health check configurations
3. Includes all necessary PostgreSQL compatibility fixes
4. Excludes Python bytecode files, caches and other unnecessary files that could cause issues

## Step 3: Deploy to Elastic Beanstalk

### Option 1: Deploy via AWS Console (Recommended for troubleshooting)

1. Log in to the AWS Elastic Beanstalk Console
2. Navigate to your environment
3. Click "Upload and deploy"
4. Upload the generated minimal package (e.g., `minimal-fixed-package-TIMESTAMP.zip`)
5. Set version label to `fixed-postgresql-al2023-comprehensive-YYYYMMDD`
6. Click "Deploy"

### Option 2: Deploy via EB CLI

For quicker deployments once you've confirmed the fixes work:

```bash
# From the backend/pyfactor directory
eb deploy -l fixed-postgresql-al2023-comprehensive-$(date +%Y%m%d) --staged
```

## Key Fixes Applied

### 1. PostgreSQL Compatibility for AL2023
- Replaced postgresql-devel with libpq-devel for Amazon Linux 2023
- Created compatibility symlinks for applications expecting postgresql-devel paths
- Added early prebuild hook to ensure PostgreSQL dependencies are available
- Fixed all configuration files referencing postgresql-devel

### 2. Python Bytecode Files
- Excluded `.pyc` files to avoid Python version compatibility issues
- Ensured clean deployment without cached bytecode from development environment

### 3. Health Check Configuration
- Set appropriate health check intervals and paths
- Configured health check timeouts to allow for startup delays

### 4. Dependency Management
- Fixed conflicts in Python dependencies
- Ensured proper installation order

## Troubleshooting Common Issues

### Issue: postgresql-devel not available
If you see errors related to postgresql-devel not being available:
- Ensure you've run the comprehensive fix script
- Verify the prebuild hook (00_fix_postgresql_al2023.sh) is included in the deployment package
- Check EB logs to ensure the hook is executed

### Issue: Health check failures
If your environment remains in warning or severe state due to failed health checks:
- Verify the health check path is accessible
- Increase health check timeout and interval if necessary
- Check application logs for startup errors

### Issue: Python bytecode conflicts
If you see unexpected Python errors after deployment:
- Ensure you're using the minimal package with bytecode files excluded
- Clear source bytecode with `find . -name "*.pyc" -delete` before creating new packages

### Issue: Package size issues
If your package is too large for the EB console upload:
- Use the minimal package approach
- Consider using S3 for larger uploads (`eb deploy --staged`)

## Verification

After deployment:
1. Check environment health is green
2. Verify no PostgreSQL-related errors in logs
3. Test database connectivity within the application
4. Verify all application functions work correctly

## Additional Resources

- Reference `scripts/Comprehensive_PostgreSQL_AL2023_Fix.md` for detailed information on the PostgreSQL fixes
- Reference `scripts/Bytecode_Files_Deployment_Fix.md` for bytecode handling fixes
- Reference `scripts/Minimal_Package_Fix.md` for package size optimization techniques

## Date
This guide was generated on May 17, 2025, incorporating all fixes developed through Version0023.
"""

    with open(guide_path, 'w') as f:
        f.write(guide_content)

    print(f"✅ Comprehensive deployment guide created at: {guide_path}")
    return guide_path

def create_deployment_script():
    """Create a single consolidated deployment script."""
    deploy_script_path = os.path.join(SCRIPTS_DIR, 'comprehensive_deploy.sh')

    deploy_script_content = """#!/bin/bash
# Comprehensive deployment script that applies all fixes and deploys
# Created by Version0024_update_deployment_guide.py

set -e
echo "=========================================================="
echo "   COMPREHENSIVE AWS ELASTIC BEANSTALK DEPLOYMENT SCRIPT  "
echo "=========================================================="
echo "Running comprehensive fixes and deployment..."

# Step 1: Apply comprehensive PostgreSQL AL2023 fixes
echo -e "\n1. Applying PostgreSQL AL2023 fixes..."
python scripts/Version0023_fix_prebuild_postgresql_devel.py

# Step 2: Create minimal optimized package
echo -e "\n2. Creating minimal optimized deployment package..."
python scripts/Version0019_create_minimal_package.py

# Get the latest minimal package
PACKAGE=$(ls -t minimal-fixed-package-*.zip | head -1)

if [ -z "$PACKAGE" ]; then
    echo "❌ Error: No deployment package found!"
    exit 1
fi

echo -e "\n✅ Found package: $PACKAGE"
echo "----------------------------------------"
echo "DEPLOYMENT OPTIONS:"
echo "----------------------------------------"
echo "1. AWS Console Manual Upload: "
echo "   a) Log in to the AWS Elastic Beanstalk Console"
echo "   b) Navigate to your environment"
echo "   c) Click 'Upload and deploy'"
echo "   d) Upload $PACKAGE"
echo "   e) Set version label to 'fixed-comprehensive-$(date +%Y%m%d)'"
echo "   f) Click 'Deploy'"
echo 
echo "2. EB CLI Deployment: "
echo "   Run: eb deploy -l fixed-comprehensive-$(date +%Y%m%d) --staged"
echo "----------------------------------------"

read -p "Do you want to deploy using EB CLI now? (y/n): " DEPLOY_NOW

if [[ $DEPLOY_NOW == "y" || $DEPLOY_NOW == "Y" ]]; then
    if command -v eb &> /dev/null; then
        echo -e "\n3. Deploying using EB CLI..."
        eb deploy -l fixed-comprehensive-$(date +%Y%m%d) --staged
        echo "✅ Deployment command executed. Check EB logs for status."
    else
        echo "❌ EB CLI not found. Please install with 'pip install awsebcli' or deploy manually."
    fi
else
    echo -e "\n3. Skipping deployment. You can deploy manually using methods described above."
fi

echo -e "\n=========================================================="
echo "For more details, see COMPREHENSIVE_DEPLOYMENT_GUIDE.md"
echo "=========================================================="
"""

    with open(deploy_script_path, 'w') as f:
        f.write(deploy_script_content)

    # Make the script executable
    os.chmod(deploy_script_path, 0o755)

    print(f"✅ Comprehensive deployment script created at: {deploy_script_path}")
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
            "name": "Version0024_update_deployment_guide.py",
            "description": "Creates consolidated deployment guide and script for AL2023 deployments",
            "date_executed": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "SUCCESS",
            "affects_files": [
                "COMPREHENSIVE_DEPLOYMENT_GUIDE.md",
                "scripts/comprehensive_deploy.sh"
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

def main():
    """Main execution function."""
    print("Creating comprehensive deployment guide and scripts...")
    
    # Create deployment guide
    guide_path = create_deployment_guide()
    
    # Create deployment script
    deploy_script_path = create_deployment_script()
    
    # Update script registry
    update_script_registry()
    
    print("\nAll deployment documentation and scripts created successfully!")
    print(f"1. Comprehensive deployment guide: {guide_path}")
    print(f"2. Simplified deployment script: {deploy_script_path}")
    print("\nTo deploy your application with all fixes, simply run:")
    print(f"  {deploy_script_path}")
    print("\nThis will apply ALL fixes and guide you through deployment.")

if __name__ == "__main__":
    main()
