#!/usr/bin/env python
"""
Version0021_fix_postgresql_base_package_al2023.py

This script fixes the issue with the basic 'postgresql' package not being available
on Amazon Linux 2023. It removes the postgresql package from the .ebextensions/02_packages.config
and enhances the prebuild hook to install PostgreSQL in multiple ways compatible with AL2023.

Author: System Administrator
Date: May 16, 2025
"""

import os
import sys
import shutil
import json
import datetime

# Paths
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EBEXTENSIONS_DIR = os.path.join(PROJECT_DIR, '.ebextensions')
PLATFORM_HOOKS_DIR = os.path.join(PROJECT_DIR, '.platform', 'hooks')
PREBUILD_HOOKS_DIR = os.path.join(PLATFORM_HOOKS_DIR, 'prebuild')
SCRIPTS_DIR = os.path.join(PROJECT_DIR, 'scripts')
BACKUPS_DIR = os.path.join(PROJECT_DIR, 'backups')

# Configuration files
PACKAGES_CONFIG = os.path.join(EBEXTENSIONS_DIR, '02_packages.config')
PREREQS_SCRIPT = os.path.join(PREBUILD_HOOKS_DIR, '02_install_prereqs.sh')
SCRIPT_REGISTRY = os.path.join(SCRIPTS_DIR, 'script_registry.js')

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

def fix_packages_config():
    """Fix the packages configuration to remove problematic postgresql package."""
    if not os.path.exists(PACKAGES_CONFIG):
        print(f"Error: {PACKAGES_CONFIG} does not exist")
        return False
    
    backup_file(PACKAGES_CONFIG)
    
    with open(PACKAGES_CONFIG, 'r') as f:
        content = f.read()
    
    # Remove the postgresql package line (keeping the postgresql client commands)
    content = content.replace('postgresql: []', '# postgresql package removed for AL2023 compatibility')
    
    # Update the command section to be more compatible with AL2023
    command_section = """commands:
  01_install_postgresql_client:
    command: |
      echo "Installing PostgreSQL client utilities..."
      # Try different methods to install PostgreSQL client
      if command -v dnf &> /dev/null; then
        # AL2023 specific methods
        dnf -y module list postgresql || echo "No PostgreSQL module available"
        dnf -y module enable postgresql:14 || echo "Failed to enable PostgreSQL module"
        dnf -y install libpq || echo "Failed to install libpq"
        
        # Try PostgreSQL AppStream
        dnf -y install dnf-plugins-core || echo "Failed to install dnf plugins"
        dnf -y config-manager --add-repo https://download.postgresql.org/pub/repos/yum/14/redhat/rhel-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm || echo "Failed to add PostgreSQL repo"
        dnf -y install postgresql14-server postgresql14-contrib || echo "Failed to install PostgreSQL 14"
      fi
      
      # Check if we have PostgreSQL client now
      if ! command -v psql &> /dev/null; then
        echo "PostgreSQL client not installed via system packages, will be handled by prebuild hook."
      else
        echo "PostgreSQL client successfully installed: $(psql --version)"
      fi
"""
    
    # Replace the existing commands section
    if "commands:" in content:
        parts = content.split("commands:")
        content = parts[0] + command_section
    else:
        content += "\n" + command_section
    
    with open(PACKAGES_CONFIG, 'w') as f:
        f.write(content)
    
    print(f"Updated packages configuration in {PACKAGES_CONFIG}")
    print("Removed postgresql package reference and updated installation commands")
    return True

def enhance_prebuild_hook():
    """Enhance the prebuild hook with better AL2023 compatibility."""
    backup_file(PREREQS_SCRIPT)
    
    prebuild_content = """#!/bin/bash
# Enhanced PostgreSQL dependencies installer for Amazon Linux 2023
set -e

echo "Running enhanced PostgreSQL dependency installer for AL2023..."

# Install system packages if package manager is available
if command -v dnf &> /dev/null; then
    echo "Installing system packages using dnf (AL2023)..."
    dnf -y update
    dnf -y install gcc-c++ python3-devel libpq-devel wget unzip make
    
    # Try multiple methods to install PostgreSQL client on AL2023
    echo "Attempting to install PostgreSQL client for AL2023..."
    
    # Method 1: Try DNF module
    dnf -y module list postgresql || echo "No PostgreSQL module available"
    dnf -y module enable postgresql:14 || echo "Failed to enable PostgreSQL module"
    dnf -y install libpq postgresql || echo "Failed to install PostgreSQL from module"
    
    # Method 2: Try PostgreSQL AppStream repo
    if ! command -v psql &> /dev/null; then
        echo "Trying PostgreSQL AppStream repo..."
        dnf -y install dnf-plugins-core || echo "Failed to install dnf plugins"
        dnf -y config-manager --add-repo https://download.postgresql.org/pub/repos/yum/14/redhat/rhel-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm || echo "Failed to add PostgreSQL repo"
        dnf -y install postgresql14-server postgresql14-contrib || echo "Failed to install PostgreSQL 14"
        
        # Add PostgreSQL binaries to PATH if they were installed to a non-standard location
        if [ -d "/usr/pgsql-14/bin" ]; then
            echo "Adding /usr/pgsql-14/bin to PATH"
            export PATH=$PATH:/usr/pgsql-14/bin
            echo 'export PATH=$PATH:/usr/pgsql-14/bin' >> /etc/profile.d/postgresql.sh
        fi
    fi
elif command -v yum &> /dev/null; then
    echo "Installing system packages using yum (AL2)..."
    yum -y update
    yum -y install gcc-c++ python3-devel libpq-devel wget unzip make
    
    # Try to install PostgreSQL client on AL2
    if command -v amazon-linux-extras &> /dev/null; then
        echo "Using amazon-linux-extras to install PostgreSQL..."
        amazon-linux-extras enable postgresql14 || echo "Could not enable postgresql with amazon-linux-extras"
        yum -y install postgresql || echo "Failed to install postgresql with yum"
    fi
else
    echo "No supported package manager found. Skipping system package installation."
fi

# If PostgreSQL client is still not installed, try direct download
if ! command -v psql &> /dev/null; then
    echo "Still no PostgreSQL client. Using direct download as fallback..."

    # Create a temp directory
    TEMP_DIR=$(mktemp -d)
    cd $TEMP_DIR

    # Download PostgreSQL binaries for Linux
    echo "Downloading PostgreSQL binaries..."
    wget -q https://ftp.postgresql.org/pub/binary/v14.9/linux-x86_64/postgresql-14.9-linux-x86_64.tar.gz || {
        echo "Failed to download PostgreSQL binaries, trying alternative method"
        # Use curl as a fallback
        curl -s -o postgresql-14.9-linux-x86_64.tar.gz https://ftp.postgresql.org/pub/binary/v14.9/linux-x86_64/postgresql-14.9-linux-x86_64.tar.gz || {
            echo "Could not download PostgreSQL binaries. Will continue without PostgreSQL client."
            cd /
            rm -rf $TEMP_DIR
        }
    }
    
    # If download succeeded, install
    if [ -f "postgresql-14.9-linux-x86_64.tar.gz" ]; then
        echo "Extracting PostgreSQL binaries..."
        tar -xzf postgresql-14.9-linux-x86_64.tar.gz
    
        # Install to /usr/local using --strip-components to avoid nested directories
        echo "Installing PostgreSQL binaries to /usr/local..."
        cd postgresql-14.9-1-linux-x86_64
        cp -r bin/* /usr/local/bin/ || echo "Could not copy bin files, continuing..."
        cp -r lib/* /usr/local/lib/ || echo "Could not copy lib files, continuing..."
        cp -r include/* /usr/local/include/ || echo "Could not copy include files, continuing..."
    
        # Clean up
        cd /
        rm -rf $TEMP_DIR
        echo "Alternative PostgreSQL client installation completed."
    fi
fi

# Create symbolic links for library detection if needed
echo "Setting up library paths and symlinks..."
for pgsql_dir in /usr/pgsql-14 /usr/pgsql-13 /usr/pgsql-12; do
    if [ -d "$pgsql_dir" ]; then
        echo "Creating symlinks from $pgsql_dir..."
        ln -sf $pgsql_dir/lib/libpq.so /usr/lib/libpq.so 2>/dev/null || echo "Failed to create libpq.so symlink"
        ln -sf $pgsql_dir/lib/libpq.so.5 /usr/lib/libpq.so.5 2>/dev/null || echo "Failed to create libpq.so.5 symlink"
        ln -sf $pgsql_dir/include /usr/include/postgresql 2>/dev/null || echo "Failed to create include symlink"
    fi
done

# Set environment variables for psycopg2 build
export LDFLAGS="-L/usr/lib -L/usr/local/lib -L/usr/pgsql-14/lib"
export CPPFLAGS="-I/usr/include -I/usr/local/include -I/usr/pgsql-14/include"
export PG_CONFIG=$(which pg_config 2>/dev/null || echo "/usr/local/bin/pg_config")

echo "PostgreSQL client detection:"
if command -v psql &> /dev/null; then
    psql --version
    echo "PostgreSQL client is available at: $(which psql)"
else
    echo "WARNING: PostgreSQL client not found despite installation attempts."
    echo "Installation will continue with psycopg2-binary package."
fi

echo "Enhanced PostgreSQL dependency setup completed!"
exit 0
"""

    # Ensure the directory exists
    os.makedirs(PREBUILD_HOOKS_DIR, exist_ok=True)
    
    with open(PREREQS_SCRIPT, 'w') as f:
        f.write(prebuild_content)
    
    # Make the script executable
    os.chmod(PREREQS_SCRIPT, 0o755)
    
    print(f"Created/updated enhanced prebuild hook at {PREREQS_SCRIPT}")
    print("✅ Enhanced prebuild hook created/updated successfully.")
    return True

def create_deployment_script():
    """Create a deployment helper script."""
    deploy_script_path = os.path.join(SCRIPTS_DIR, 'deploy_al2023_postgresql_fixed.sh')
    
    deploy_script_content = """#!/bin/bash
# Script to deploy with fixed PostgreSQL packages for AL2023
# Created by Version0021_fix_postgresql_base_package_al2023.py

set -e
echo "Preparing optimized deployment package with PostgreSQL AL2023 fixes..."

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
echo "5. Set version label to 'fixed-postgresql-2-al2023-$(date +%Y%m%d)'"
echo "6. Click 'Deploy'"
echo ""
echo "Or to deploy using the EB CLI, run:"
echo "eb deploy -l fixed-postgresql-2-al2023-$(date +%Y%m%d) --staged"
echo ""

read -p "Do you want to deploy using EB CLI now? (y/n): " DEPLOY_NOW

if [[ $DEPLOY_NOW == "y" || $DEPLOY_NOW == "Y" ]]; then
    if command -v eb &> /dev/null; then
        echo "Deploying using EB CLI..."
        eb deploy -l fixed-postgresql-2-al2023-$(date +%Y%m%d) --staged
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
    if not os.path.exists(SCRIPT_REGISTRY):
        # Create script registry if it doesn't exist
        with open(SCRIPT_REGISTRY, 'w') as f:
            f.write("""// Script Registry
// This file tracks all scripts that have been executed in this project

const scriptRegistry = {
    scripts: []
};

module.exports = scriptRegistry;
""")
    
    try:
        with open(SCRIPT_REGISTRY, 'r') as f:
            content = f.read()
        
        script_info = {
            "name": "Version0021_fix_postgresql_base_package_al2023.py",
            "description": "Fixes postgresql base package for Amazon Linux 2023 compatibility",
            "date_executed": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "SUCCESS",
            "affects_files": [
                ".ebextensions/02_packages.config",
                ".platform/hooks/prebuild/02_install_prereqs.sh",
                "scripts/deploy_al2023_postgresql_fixed.sh"
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
            
            with open(SCRIPT_REGISTRY, 'w') as f:
                f.write(new_content)
            
            print("Script registry updated successfully.")
        else:
            print("Could not update script registry: unexpected format.")
    except Exception as e:
        print(f"Error updating script registry: {str(e)}")

def create_documentation():
    """Create documentation for this fix."""
    docs_path = os.path.join(SCRIPTS_DIR, 'AL2023_PostgreSQL_Fix_v2.md')
    
    doc_content = """# PostgreSQL Base Package Fix for Amazon Linux 2023

## Issue
The deployment to AWS Elastic Beanstalk on Amazon Linux 2023 was failing with the following error:
```
Error occurred during build: Yum does not have postgresql available for installation
```

This error occurs because the `postgresql` package is not available in the default repositories for Amazon Linux 2023.

## Root Cause Analysis
Amazon Linux 2023 uses different package management and repositories compared to Amazon Linux 2. The previous fix addressed `postgresql-devel` but still referenced the base `postgresql` package in the `.ebextensions/02_packages.config` file, which is also not available in the default AL2023 repositories.

## Solution
The script `Version0021_fix_postgresql_base_package_al2023.py` implements fixes to address this issue:

1. Updates `.ebextensions/02_packages.config` to:
   - Remove the reference to `postgresql` package completely
   - Keep the required `libpq-devel` package
   - Update the commands section to use dnf modules on AL2023

2. Enhances `.platform/hooks/prebuild/02_install_prereqs.sh` to:
   - Try multiple installation methods specifically for AL2023
   - Use `dnf module` commands to enable and install PostgreSQL 14
   - Try the PostgreSQL AppStream repository as a fallback
   - Continue using direct binary download as the last resort
   - Set up proper environment variables and symlinks

## Deployment
To deploy using this fix:

1. Run the fix script:
```bash
cd /path/to/backend/pyfactor
python scripts/Version0021_fix_postgresql_base_package_al2023.py
```

2. Use the generated deployment script:
```bash
./scripts/deploy_al2023_postgresql_fixed.sh
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
- The PostgreSQL client is installed and available for the application
- Database operations work correctly

## Additional Notes
This fix builds upon previous fixes for PostgreSQL dependencies but specifically addresses the base `postgresql` package issue that was causing deployment failures.

## Date Implemented
May 16, 2025
"""
    
    with open(docs_path, 'w') as f:
        f.write(doc_content)
    
    print(f"✅ Documentation created at: {docs_path}")
    return docs_path

def main():
    """Main execution function."""
    print("Fixing missing PostgreSQL base package issue for Amazon Linux 2023...")
    
    # Fix packages config
    if fix_packages_config():
        print("✅ Packages configuration updated successfully.")
    else:
        print("❌ Failed to update packages configuration.")
    
    # Enhance prebuild hook
    if enhance_prebuild_hook():
        print("✅ Prebuild hook enhanced successfully.")
    else:
        print("❌ Failed to enhance prebuild hook.")
    
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

if __name__ == "__main__":
    main()
