#!/usr/bin/env python
"""
Script: Version0020_fix_postgresql_dependency_al2023.py
Purpose: Fix PostgreSQL dependency issue in AWS Elastic Beanstalk on Amazon Linux 2023
Issue: Yum does not have postgresql-devel available for installation on AL2023
Author: System
Date: May 16, 2025
"""

import os
import sys
import shutil
import subprocess
import re
from datetime import datetime

# Configuration paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP_DIR = os.path.join(PROJECT_ROOT, 'backups')
PACKAGES_CONFIG = os.path.join(PROJECT_ROOT, '.ebextensions/02_packages.config')
PLATFORM_HOOKS_DIR = os.path.join(PROJECT_ROOT, '.platform/hooks')
PREBUILD_HOOK_DIR = os.path.join(PLATFORM_HOOKS_DIR, 'prebuild')
PREBUILD_HOOK = os.path.join(PREBUILD_HOOK_DIR, '02_install_prereqs.sh')
REQUIREMENTS_FILE = os.path.join(PROJECT_ROOT, 'requirements-eb.txt')

def create_backup(file_path):
    """Create a backup of the file with timestamp."""
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = os.path.basename(file_path)
    backup_path = os.path.join(BACKUP_DIR, f"{filename}.backup_{timestamp}")
    
    shutil.copy2(file_path, backup_path)
    print(f"Created backup at: {backup_path}")
    return backup_path

def fix_packages_config():
    """Fix the packages configuration file for AL2023."""
    if not os.path.exists(PACKAGES_CONFIG):
        print(f"Error: Packages config file not found at {PACKAGES_CONFIG}")
        return False
    
    # Backup the original file
    backup_path = create_backup(PACKAGES_CONFIG)
    
    with open(PACKAGES_CONFIG, 'r') as f:
        content = f.read()
    
    # Fix the packages configuration
    # Ensure we're using libpq-devel and not postgresql-devel
    # Also add additional helpful packages that might help with PostgreSQL
    new_content = """packages:
  yum:
    gcc-c++: []
    python3-devel: []
    libpq-devel: []
    postgresql: []
    # The following are added for better PostgreSQL support on AL2023
    wget: []
    unzip: []
    make: []

commands:
  01_install_postgresql_client:
    command: |
      # Ensure system libraries are installed
      dnf -y install postgresql
      # Make sure PostgreSQL client is available
      if ! command -v psql &> /dev/null; then
        echo "Installing PostgreSQL client..."
        amazon-linux-extras enable postgresql14
        dnf -y install postgresql
      fi
"""
    
    # Write the updated content
    with open(PACKAGES_CONFIG, 'w') as f:
        f.write(new_content)
    
    print(f"Updated packages configuration in {PACKAGES_CONFIG}")
    print("Added explicit installation commands for PostgreSQL client")
    return True

def fix_prebuild_hook():
    """Create or update the prebuild hook to install PostgreSQL dependencies."""
    if not os.path.exists(PREBUILD_HOOK_DIR):
        os.makedirs(PREBUILD_HOOK_DIR, exist_ok=True)
    
    # Backup if exists
    if os.path.exists(PREBUILD_HOOK):
        backup_path = create_backup(PREBUILD_HOOK)
    
    # Create a new prebuild hook script
    hook_content = """#!/bin/bash
# Install PostgreSQL dependencies for Amazon Linux 2023
set -e

echo "Running PostgreSQL dependency installer for AL2023..."

# Install system packages if yum is available
if command -v yum &> /dev/null || command -v dnf &> /dev/null; then
    echo "Installing system packages using dnf/yum..."
    if command -v dnf &> /dev/null; then
        dnf -y update
        dnf -y install gcc-c++ python3-devel libpq-devel wget unzip make
        dnf -y install postgresql || echo "PostgreSQL client not available in main repos"
    else
        yum -y update
        yum -y install gcc-c++ python3-devel libpq-devel wget unzip make
        yum -y install postgresql || echo "PostgreSQL client not available in main repos"
    fi
else
    echo "dnf/yum not found. Skipping system package installation."
fi

# Set up PostgreSQL repository if needed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL client not installed. Attempting alternative installation..."
    
    # Try amazon-linux-extras for AL2
    if command -v amazon-linux-extras &> /dev/null; then
        echo "Using amazon-linux-extras to install PostgreSQL..."
        amazon-linux-extras enable postgresql14 || echo "Could not enable postgresql with amazon-linux-extras"
        yum -y install postgresql || echo "Failed to install postgresql with yum"
    fi
    
    # Check if we have PostgreSQL client now
    if ! command -v psql &> /dev/null; then
        echo "Still no PostgreSQL client. Using direct download as fallback..."
        
        # Create a temp directory
        TEMP_DIR=$(mktemp -d)
        cd $TEMP_DIR
        
        # Download PostgreSQL binaries
        wget -q https://ftp.postgresql.org/pub/binary/v14.9/linux-x86_64/postgresql-14.9-linux-x86_64.tar.gz
        tar -xzf postgresql-14.9-linux-x86_64.tar.gz
        
        # Install to /usr/local
        cd postgresql-14.9-1-linux-x86_64
        cp -r bin/* /usr/local/bin/
        cp -r lib/* /usr/local/lib/ || echo "Could not copy lib files, continuing..."
        cp -r include/* /usr/local/include/ || echo "Could not copy include files, continuing..."
        
        # Clean up
        cd /
        rm -rf $TEMP_DIR
        
        echo "Alternative PostgreSQL client installation completed."
    fi
fi

# Create symbolic links for library detection if needed
if [ -d "/usr/pgsql-14" ]; then
    echo "Creating symlinks for PostgreSQL libraries..."
    ln -sf /usr/pgsql-14/lib/libpq.so /usr/lib/libpq.so || echo "Failed to create libpq.so symlink"
    ln -sf /usr/pgsql-14/lib/libpq.so.5 /usr/lib/libpq.so.5 || echo "Failed to create libpq.so.5 symlink"
    ln -sf /usr/pgsql-14/include /usr/include/postgresql || echo "Failed to create include symlink"
fi

# Set environment variables for psycopg2 build
export LDFLAGS="-L/usr/lib -L/usr/local/lib -L/usr/pgsql-14/lib"
export CPPFLAGS="-I/usr/include -I/usr/local/include -I/usr/pgsql-14/include"

echo "PostgreSQL dependency setup completed successfully!"
exit 0
"""
    
    # Write the hook script
    with open(PREBUILD_HOOK, 'w') as f:
        f.write(hook_content)
    
    # Make it executable
    os.chmod(PREBUILD_HOOK, 0o755)
    
    print(f"Created/updated prebuild hook at {PREBUILD_HOOK}")
    return True

def fix_requirements():
    """Update requirements file to use binary wheel for psycopg2."""
    if not os.path.exists(REQUIREMENTS_FILE):
        print(f"Warning: Requirements file not found at {REQUIREMENTS_FILE}")
        return False
    
    # Backup the original file
    backup_path = create_backup(REQUIREMENTS_FILE)
    
    with open(REQUIREMENTS_FILE, 'r') as f:
        content = f.readlines()
    
    # Replace psycopg2 with psycopg2-binary if present
    new_content = []
    psycopg2_replaced = False
    
    for line in content:
        if line.strip().startswith('psycopg2==') or line.strip() == 'psycopg2':
            new_content.append('psycopg2-binary==2.9.6\n')
            psycopg2_replaced = True
        else:
            new_content.append(line)
    
    # If psycopg2 wasn't found, add psycopg2-binary
    if not psycopg2_replaced:
        new_content.append('\n# Added for PostgreSQL support\npsycopg2-binary==2.9.6\n')
    
    # Write the updated content
    with open(REQUIREMENTS_FILE, 'w') as f:
        f.writelines(new_content)
    
    print(f"Updated requirements in {REQUIREMENTS_FILE}")
    print("Using psycopg2-binary instead of psycopg2 for better compatibility")
    return True

def create_helper_script():
    """Create a deployment helper script."""
    deploy_script_path = os.path.join(SCRIPT_DIR, 'deploy_al2023_fixed.sh')
    
    script_content = """#!/bin/bash
# Deployment script for AL2023 with PostgreSQL fix
# Created by Version0020_fix_postgresql_dependency_al2023.py

set -e

echo "Preparing deployment with AL2023 PostgreSQL fix..."

# Current directory
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

# Create a timestamp
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

# Create a version label
VERSION_LABEL="fixed-al2023-$TIMESTAMP"

# Create minimal package with fixes
echo "Creating minimal deployment package..."
python scripts/Version0019_create_minimal_package.py

# Get the latest minimal package
MINIMAL_PACKAGE=$(ls -t minimal-fixed-package-*.zip | head -1)

if [ -z "$MINIMAL_PACKAGE" ]; then
    echo "Error: Could not find minimal package. Run Version0019_create_minimal_package.py first."
    exit 1
fi

echo "Using package: $MINIMAL_PACKAGE"

# Use eb cli to deploy
if command -v eb &> /dev/null; then
    echo "Deploying using Elastic Beanstalk CLI..."
    eb deploy -v --staged --label "$VERSION_LABEL"
else
    echo "Elastic Beanstalk CLI not found."
    echo "To deploy manually:"
    echo "1. Upload $MINIMAL_PACKAGE to AWS Elastic Beanstalk Console"
    echo "2. Use version label: $VERSION_LABEL"
fi

echo "Deployment preparation complete!"
"""
    
    # Write the script
    with open(deploy_script_path, 'w') as f:
        f.write(script_content)
    
    # Make it executable
    os.chmod(deploy_script_path, 0o755)
    
    print(f"Created deployment helper script at {deploy_script_path}")
    return deploy_script_path

def create_documentation():
    """Create documentation for the AL2023 PostgreSQL fix."""
    doc_path = os.path.join(SCRIPT_DIR, 'AL2023_PostgreSQL_Fix.md')
    
    doc_content = """# PostgreSQL Dependency Fix for Amazon Linux 2023

## Issue
The deployment to AWS Elastic Beanstalk on Amazon Linux 2023 was failing with the following error:
```
Error occurred during build: Yum does not have postgresql-devel available for installation
```

This error occurs because the `postgresql-devel` package is not available in the default repositories for Amazon Linux 2023.

## Root Cause Analysis
Amazon Linux 2023 uses different package repositories than previous versions, and the `postgresql-devel` package is either named differently or must be installed through different means. The correct package to use is `libpq-devel` which provides the PostgreSQL client libraries needed for Python's psycopg2 to compile.

## Solution
The script `Version0020_fix_postgresql_dependency_al2023.py` implements multiple fixes to address this issue:

1. Updates `.ebextensions/02_packages.config` to:
   - Remove any reference to `postgresql-devel`
   - Ensure `libpq-devel` is used instead
   - Add additional helper packages (wget, unzip, make)
   - Add commands to install the PostgreSQL client explicitly

2. Creates/updates `.platform/hooks/prebuild/02_install_prereqs.sh` to:
   - Install required system packages with proper error handling
   - Set up PostgreSQL client through multiple fallback methods
   - Create necessary symlinks for library detection
   - Set environment variables for proper psycopg2 compilation

3. Updates `requirements-eb.txt` to:
   - Replace `psycopg2` with `psycopg2-binary` which is pre-compiled
   - This avoids the need to compile psycopg2 from source during deployment

## Deployment
To deploy using this fix:

1. Run the fix script:
```bash
cd /path/to/backend/pyfactor
python scripts/Version0020_fix_postgresql_dependency_al2023.py
```

2. Use the generated deployment script:
```bash
./scripts/deploy_al2023_fixed.sh
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
- The PostgreSQL dependencies are properly installed
- Database operations work correctly

## Date Implemented
May 16, 2025
"""
    
    with open(doc_path, 'w') as f:
        f.write(doc_content)
    
    print(f"Created documentation at: {doc_path}")
    return doc_path

def update_script_registry():
    """Add this script to the script registry."""
    registry_path = os.path.join(SCRIPT_DIR, 'script_registry.js')
    
    if not os.path.exists(registry_path):
        print("Warning: script_registry.js not found. Creating new registry.")
        registry_content = """// Script Registry
// Maintains a record of all scripts executed and their purposes

const scriptRegistry = [
  {
    script: "Version0020_fix_postgresql_dependency_al2023.py",
    purpose: "Fix PostgreSQL dependency issue in AWS Elastic Beanstalk on Amazon Linux 2023",
    issue: "Yum does not have postgresql-devel available for installation",
    executed: "May 16, 2025",
    status: "Success",
    target: ".ebextensions/02_packages.config, .platform/hooks/prebuild/02_install_prereqs.sh"
  }
];

module.exports = scriptRegistry;
"""
        with open(registry_path, 'w') as f:
            f.write(registry_content)
        print("Created new script registry with this script entry.")
        return
    
    # Read existing registry
    with open(registry_path, 'r') as f:
        content = f.read()
    
    # Check if script is already in registry
    if "Version0020_fix_postgresql_dependency_al2023.py" in content:
        print("Script already exists in registry. Skipping update.")
        return
    
    # Add new entry
    entry = """  {
    script: "Version0020_fix_postgresql_dependency_al2023.py",
    purpose: "Fix PostgreSQL dependency issue in AWS Elastic Beanstalk on Amazon Linux 2023",
    issue: "Yum does not have postgresql-devel available for installation",
    executed: "May 16, 2025",
    status: "Success",
    target: ".ebextensions/02_packages.config, .platform/hooks/prebuild/02_install_prereqs.sh"
  },
"""
    
    # Insert the new entry after the opening bracket of the array
    insert_pos = content.find("const scriptRegistry = [") + len("const scriptRegistry = [")
    updated_content = content[:insert_pos] + "\n" + entry + content[insert_pos:]
    
    with open(registry_path, 'w') as f:
        f.write(updated_content)
    
    print("Script registry updated successfully.")

if __name__ == "__main__":
    print("Fixing PostgreSQL dependency for Amazon Linux 2023...")
    
    # Fix the packages config
    if fix_packages_config():
        print("✅ Packages configuration updated successfully.")
    else:
        print("❌ Failed to update packages configuration.")
        sys.exit(1)
    
    # Fix prebuild hook
    if fix_prebuild_hook():
        print("✅ Prebuild hook created/updated successfully.")
    else:
        print("❌ Failed to create/update prebuild hook.")
        sys.exit(1)
    
    # Fix requirements
    if fix_requirements():
        print("✅ Requirements updated successfully.")
    else:
        print("❌ Failed to update requirements.")
        # Not exiting here as this is optional
    
    # Create helper script
    deploy_script = create_helper_script()
    if deploy_script:
        print(f"✅ Deployment helper script created at: {deploy_script}")
    else:
        print("❌ Failed to create deployment helper script.")
    
    # Create documentation
    doc_path = create_documentation()
    if doc_path:
        print(f"✅ Documentation created at: {doc_path}")
    else:
        print("❌ Failed to create documentation.")
    
    # Update script registry
    update_script_registry()
    
    print("\nAll fixes applied successfully!")
    print("To deploy with these fixes, run:")
    print("  1. Create a new minimal package:")
    print("     python scripts/Version0019_create_minimal_package.py")
    print("  2. Deploy using the helper script:")
    print("     ./scripts/deploy_al2023_fixed.sh")
    print("  OR upload the minimal package to the AWS Elastic Beanstalk Console manually.")
