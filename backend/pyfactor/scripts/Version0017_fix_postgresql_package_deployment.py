#!/usr/bin/env python3
"""
Version0017_fix_postgresql_package_deployment.py
================================================

Fix PostgreSQL package installation for Elastic Beanstalk deployment on Amazon Linux 2023
by creating a custom command script that installs PostgreSQL packages directly,
rather than relying on .ebextensions which are failing.

Created: 2025-05-16
Author: DevOps Team
"""

import os
import sys
import shutil
import datetime
from pathlib import Path
import subprocess

# Define file paths
BASE_DIR = Path("/Users/kuoldeng/projectx/backend/pyfactor")
os.chdir(BASE_DIR)

EB_CONFIG_DIR = BASE_DIR / ".ebextensions"
PLATFORM_HOOKS_DIR = BASE_DIR / ".platform" / "hooks" / "prebuild"
EB_PACKAGES_CONFIG = EB_CONFIG_DIR / "02_packages.config"

TIMESTAMP = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

def create_backup(file_path):
    """Create a backup of the specified file."""
    if os.path.exists(file_path):
        backup_path = f"{file_path}.backup-{TIMESTAMP}"
        shutil.copy2(file_path, backup_path)
        print(f"Created backup: {backup_path}")
        return backup_path
    return None

def update_packages_config():
    """Update the .ebextensions/02_packages.config file."""
    create_backup(EB_PACKAGES_CONFIG)
    
    # Create a new version of the config file that addresses the PostgreSQL package issues
    new_config = """packages:
  yum:
    gcc-c++: []
    python3-devel: []
    # Using libpq-devel as a primary option instead of postgresql-devel
    libpq-devel: []
"""
    
    with open(EB_PACKAGES_CONFIG, "w") as f:
        f.write(new_config)
    
    print(f"Updated {EB_PACKAGES_CONFIG} to use libpq-devel instead of postgresql-devel")

def create_postgresql_installer():
    """Create a custom script to install PostgreSQL packages before the main prebuild script runs."""
    installer_path = PLATFORM_HOOKS_DIR / "00_install_postgresql.sh"
    
    script_content = """#!/bin/bash
# PostgreSQL package installer for Amazon Linux 2023
# Created by Version0017_fix_postgresql_package_deployment.py

set -e
set -o pipefail

echo "=== CUSTOM POSTGRESQL PACKAGE INSTALLER ==="
echo "Running script at $(date)"
echo "Detecting Amazon Linux version..."

# Check Amazon Linux version
AL_VERSION="unknown"
if grep -q "Amazon Linux release 2023" /etc/os-release; then
    AL_VERSION="al2023"
    echo "Detected Amazon Linux 2023"
elif grep -q "Amazon Linux 2" /etc/os-release; then
    AL_VERSION="al2"
    echo "Detected Amazon Linux 2"
else
    echo "Unknown Amazon Linux version, will try multiple approaches"
fi

# Function to try installing PostgreSQL packages using various methods
install_postgresql_packages() {
    echo "Attempting to enable PostgreSQL repository..."
    
    if [[ "$AL_VERSION" == "al2023" ]]; then
        # For Amazon Linux 2023
        echo "Enabling PostgreSQL module and repository for AL2023..."
        
        # Try enabling Amazon Linux modules first
        sudo dnf install -y dnf-plugins-core || echo "Warning: Could not install dnf-plugins-core"
        sudo dnf config-manager --set-enabled amazonlinux-appstream || echo "Warning: Could not enable appstream"
        
        # Try multiple PostgreSQL package variants for AL2023
        echo "Trying to install PostgreSQL development package (libpq-devel)..."
        if sudo dnf install -y libpq-devel; then
            echo "Successfully installed libpq-devel"
            return 0
        fi
        
        echo "Trying to install PostgreSQL development package (postgresql-devel)..."
        if sudo dnf install -y postgresql-devel; then
            echo "Successfully installed postgresql-devel"
            return 0
        fi
        
        # Try specific PostgreSQL version packages
        for pg_version in 15 14 13 12 11; do
            echo "Attempting to install postgresql${pg_version}-devel..."
            if sudo dnf install -y postgresql${pg_version}-devel; then
                echo "Successfully installed postgresql${pg_version}-devel"
                return 0
            fi
        done
        
        # Last resort: Install PostgreSQL from PGDG repo for AL2023
        echo "Attempting to install PostgreSQL from PGDG repository..."
        sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm || true
        sudo dnf -qy module disable postgresql || true
        if sudo dnf install -y postgresql15-devel; then
            echo "Successfully installed postgresql15-devel from PGDG repository"
            return 0
        fi
    else
        # For Amazon Linux 2 or unknown
        echo "Attempting to install PostgreSQL packages for AL2 or unknown..."
        
        # Try the standard package first
        if sudo yum install -y postgresql-devel; then
            echo "Successfully installed postgresql-devel"
            return 0
        fi
        
        # Try libpq-devel as an alternative
        if sudo yum install -y libpq-devel; then
            echo "Successfully installed libpq-devel"
            return 0
        fi
        
        # Try specific PostgreSQL version packages
        for pg_version in 15 14 13 12 11; do
            echo "Attempting to install postgresql${pg_version}-devel..."
            if sudo yum install -y postgresql${pg_version}-devel; then
                echo "Successfully installed postgresql${pg_version}-devel"
                return 0
            fi
        done
        
        # Last resort: Install PostgreSQL from PGDG repo for AL2
        echo "Attempting to install PostgreSQL from PGDG repository..."
        sudo yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm || true
        if sudo yum install -y postgresql15-devel; then
            echo "Successfully installed postgresql15-devel from PGDG repository"
            return 0
        fi
    fi
    
    echo "WARNING: All attempts to install PostgreSQL development packages failed."
    echo "Will attempt to continue without them, but psycopg2 compilation may fail."
    echo "Consider using psycopg2-binary package instead which doesn't require these dependencies."
    
    # Return non-zero but don't stop the deployment
    return 1
}

# Execute the PostgreSQL package installation
install_postgresql_packages || echo "PostgreSQL package installation failed, but continuing deployment"

# Verify installation
echo "Checking for PostgreSQL development files..."
if pkg-config --exists libpq; then
    echo "libpq found via pkg-config"
    pkg-config --modversion libpq
    pkg-config --cflags libpq
elif [ -f "/usr/include/libpq-fe.h" ]; then
    echo "libpq-fe.h header found"
elif [ -f "/usr/include/postgresql/libpq-fe.h" ]; then
    echo "postgresql/libpq-fe.h header found"
else
    echo "WARNING: No PostgreSQL development files found."
    echo "Will attempt to use psycopg2-binary package if available."
fi

echo "=== POSTGRESQL PACKAGE INSTALLATION COMPLETED ==="
"""
    
    with open(installer_path, "w") as f:
        f.write(script_content)
    
    # Make the script executable
    os.chmod(installer_path, 0o755)
    
    print(f"Created PostgreSQL installer script: {installer_path}")

def modify_requirements():
    """Update requirements-eb.txt to use psycopg2-binary instead of psycopg2."""
    req_file = BASE_DIR / "requirements-eb.txt"
    
    if not os.path.exists(req_file):
        print(f"Warning: {req_file} not found, skipping requirements modification")
        return
    
    create_backup(req_file)
    
    with open(req_file, "r") as f:
        content = f.read()
    
    # Replace psycopg2 with psycopg2-binary if it exists
    if "psycopg2==" in content and "psycopg2-binary==" not in content:
        content = content.replace("psycopg2==", "psycopg2-binary==")
        with open(req_file, "w") as f:
            f.write(content)
        print(f"Updated {req_file} to use psycopg2-binary instead of psycopg2")
    else:
        print(f"No changes needed for {req_file}")

def create_updated_deployment_package():
    """Create a new deployment package with all the fixes."""
    package_script = """#!/bin/bash
# Script to create and deploy an updated package with PostgreSQL fixes
# Created by Version0017_fix_postgresql_package_deployment.py

set -e

echo "==== Creating Optimized Deployment Package with PostgreSQL Fixes ===="
cd /Users/kuoldeng/projectx/backend/pyfactor

# Clean up any Python bytecode files
find . -type d -name "__pycache__" -exec rm -rf {} +
find . -name "*.pyc" -delete
find . -name "*.pyo" -delete
find . -name "*.pyd" -delete

# Create a ZIP file with all necessary files
echo "Creating ZIP file..."
zip -r postgresql-fixed-package.zip . -x "*.git*" -x "*.pyc" -x "*.pyo" -x "*.pyd" -x "*__pycache__*" -x "*.DS_Store" -x "*.venv*" -x "*.idea*" -x "*.ipynb_checkpoints*"

echo ""
echo "==== Deployment Package Created: postgresql-fixed-package.zip ===="
echo ""
echo "To deploy through AWS Elastic Beanstalk Console:"
echo "1. Log into AWS Console and navigate to Elastic Beanstalk"
echo "2. Select your environment"
echo "3. Choose 'Upload and deploy'"
echo "4. Upload the postgresql-fixed-package.zip file"
echo "5. Click 'Deploy'"
echo ""
echo "To deploy using EB CLI:"
echo "eb deploy --staged"
echo ""
"""
    
    script_path = BASE_DIR / "scripts" / "deploy_postgresql_fixed.sh"
    
    with open(script_path, "w") as f:
        f.write(package_script)
    
    # Make the script executable
    os.chmod(script_path, 0o755)
    
    print(f"Created deployment script: {script_path}")

def main():
    print("=" * 80)
    print("PostgreSQL Package Fix for AWS Elastic Beanstalk Deployment")
    print("Version0017_fix_postgresql_package_deployment.py")
    print("=" * 80)
    
    # Update packages config
    update_packages_config()
    
    # Create custom PostgreSQL installer
    create_postgresql_installer()
    
    # Modify requirements to use psycopg2-binary
    modify_requirements()
    
    # Create updated deployment package script
    create_updated_deployment_package()
    
    print("\nAll fixes have been applied successfully!")
    print("\nTo deploy the fixed application:")
    print("1. Run the create package script:")
    print("   cd /Users/kuoldeng/projectx/backend/pyfactor")
    print("   ./scripts/deploy_postgresql_fixed.sh")
    print("2. Deploy the package via AWS Console or EB CLI")
    print("=" * 80)

if __name__ == "__main__":
    main()
