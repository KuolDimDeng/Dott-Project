#!/usr/bin/env python3
"""
Version0014_fix_postgresql_package_al2023.py - Fix PostgreSQL package for Amazon Linux 2023

This script addresses the deployment error:
"Error occurred during build: Yum does not have postgresql15-devel available for installation"

It updates the package installation to use a compatible approach for Amazon Linux 2023
by enabling the PostgreSQL modules and repositories first.

Created: 2025-05-16
Author: Cline
"""

import os
import shutil
import datetime
from pathlib import Path

def create_backup(file_path):
    """Create a backup of the file before modifying it."""
    backup_path = f"{file_path}.backup-{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(file_path, backup_path)
    print(f"Created backup at {backup_path}")
    return backup_path

def fix_prebuild_hook():
    """Update the prebuild hook script to enable PostgreSQL repositories and install packages properly for AL2023."""
    # Path to the hooks directory
    hooks_dir = Path("/Users/kuoldeng/projectx/backend/pyfactor/.platform/hooks/prebuild")
    
    # Path to the install dependencies script
    install_script = hooks_dir / "01_install_dependencies.sh"
    
    if not install_script.exists():
        print(f"Error: Script not found at {install_script}")
        return False
    
    # Create a backup
    create_backup(install_script)
    
    # Read the current content
    with open(install_script, 'r') as f:
        content = f.read()
    
    # Find and replace the postgresql-devel installation section
    import re
    postgresql_pattern = re.compile(r'# Install PostgreSQL libraries.*?\}\s*\n', re.DOTALL)
    match = postgresql_pattern.search(content)
    
    if match:
        # Create a more robust PostgreSQL installation section that works on AL2023
        new_postgres_section = """# Install PostgreSQL libraries if needed (for non-binary psycopg2)
echo "Ensuring PostgreSQL libraries are installed"
which yum > /dev/null && {
    # Detect Amazon Linux version
    if grep -q "Amazon Linux release 2023" /etc/os-release; then
        echo "Detected Amazon Linux 2023"
        
        # Enable PostgreSQL modules
        echo "Enabling PostgreSQL module"
        sudo dnf install -y dnf-plugins-core
        sudo dnf config-manager --set-enabled amazonlinux-appstream
        
        # First try the postgresql-devel package
        if ! sudo yum install -y postgresql-devel; then
            echo "Failed to install postgresql-devel, trying libpq-devel"
            # Try libpq-devel which is often a suitable replacement
            if ! sudo yum install -y libpq-devel; then
                echo "Failed to install libpq-devel, trying postgresql13-devel"
                # Try specific postgresql version packages
                for pg_version in 15 14 13 12 11; do
                    echo "Attempting to install postgresql${pg_version}-devel"
                    if sudo yum install -y postgresql${pg_version}-devel; then
                        echo "Successfully installed postgresql${pg_version}-devel"
                        break
                    fi
                done
            fi
        fi
    else
        echo "Detected Amazon Linux 2 or other - using postgresql-devel package"
        yum list installed | grep -qw postgresql-devel || sudo yum install -y postgresql-devel
    fi
}
"""
        
        # Replace the matched section with our new section
        new_content = postgresql_pattern.sub(new_postgres_section, content)
        
        # Write the updated content
        with open(install_script, 'w') as f:
            f.write(new_content)
        
        print(f"Successfully updated {install_script}")
        return True
    else:
        print("Error: Could not locate PostgreSQL installation section in the script.")
        return False

def update_packages_config():
    """Update the .ebextensions packages configuration for Amazon Linux 2023."""
    config_path = Path("/Users/kuoldeng/projectx/backend/pyfactor/.ebextensions/02_packages.config")
    
    if not config_path.exists():
        print(f"Error: Config file not found at {config_path}")
        return False
    
    # Create a backup
    create_backup(config_path)
    
    # Update the content to include more flexible package options
    new_content = """packages:
  yum:
    gcc-c++: []
    libpq-devel: []
    python3-devel: []
    # Package names for PostgreSQL development libraries
    postgresql-devel: []
"""
    
    # Write the updated content
    with open(config_path, 'w') as f:
        f.write(new_content)
    
    print(f"Successfully updated {config_path}")
    return True

def create_postgres_install_commands():
    """Create a new .ebextensions config file for enabling PostgreSQL repositories."""
    config_path = Path("/Users/kuoldeng/projectx/backend/pyfactor/.ebextensions/06_extra_packages.config")
    
    # Create the new config file content
    new_content = """# Additional commands to enable PostgreSQL repositories on Amazon Linux 2023
commands:
  01_enable_amazon_extras:
    command: "dnf install -y dnf-plugins-core && dnf config-manager --set-enabled amazonlinux-appstream"
    ignoreErrors: true
  02_install_dev_tools:
    command: "yum groupinstall -y 'Development Tools'"
    ignoreErrors: true
  03_install_libpq:
    command: "yum install -y libpq-devel"
    ignoreErrors: true
"""
    
    # Write the new file
    with open(config_path, 'w') as f:
        f.write(new_content)
    
    print(f"Created new config file at {config_path}")
    return True

def create_deployment_instructions():
    """Create a README file with deployment instructions."""
    instructions_path = Path("/Users/kuoldeng/projectx/backend/pyfactor/scripts/PostgreSQL_AL2023_Fix.md")
    
    instructions = """# PostgreSQL Package Fix for Amazon Linux 2023 (Updated)

## Problem

The Elastic Beanstalk deployment failed with the error:
```
Error occurred during build: Yum does not have postgresql15-devel available for installation
```

This occurred because Amazon Linux 2023 handles PostgreSQL packages differently than Amazon Linux 2.
The `postgresql15-devel` package is not available in the default repositories.

## Comprehensive Solution

This updated fix implements a more robust approach:

1. Updated the `.platform/hooks/prebuild/01_install_dependencies.sh` script to:
   - Detect Amazon Linux 2023
   - Enable the appropriate repositories
   - Try multiple PostgreSQL development packages:
     - First try: `postgresql-devel`
     - Second try: `libpq-devel`
     - Fallback tries: `postgresql{15,14,13,12,11}-devel`

2. Updated the `.ebextensions/02_packages.config` to use more widely available packages

3. Created a new `.ebextensions/06_extra_packages.config` to:
   - Enable Amazon Linux appstream repositories
   - Install development tools
   - Install libpq-devel as a backup

## Deployment Instructions

1. Regenerate the deployment package:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor
   ./scripts/prepare_eb_package.sh
   ```

2. Upload the new package through the Elastic Beanstalk Console

## Technical Details

Amazon Linux 2023 uses the DNF package manager and has different repository structures than Amazon Linux 2.
The packages needed for PostgreSQL development are:

1. `libpq-devel` - Contains PostgreSQL client headers and is often available in the base repositories
2. `postgresql-devel` - The general development package (may be named differently in AL2023)
3. `postgresql{version}-devel` - Version-specific development packages

Our approach tries all these options to maximize the chance of success.

## Troubleshooting

If you still encounter issues after deployment:

1. SSH into the EC2 instance and manually inspect available PostgreSQL packages:
   ```
   sudo dnf list --available | grep postgres
   ```

2. Check which repositories are enabled:
   ```
   sudo dnf repolist
   ```

3. Check the cfn-init logs:
   ```
   cat /var/log/cfn-init.log
   ```
"""
    
    # Write the instructions
    with open(instructions_path, 'w') as f:
        f.write(instructions)
    
    print(f"Created instructions at {instructions_path}")
    return True

def main():
    """Main function to execute all fix steps."""
    print("=== Starting Version0014_fix_postgresql_package_al2023.py ===")
    
    # Fix the prebuild hook script
    prebuild_success = fix_prebuild_hook()
    
    # Update the packages configuration
    packages_success = update_packages_config()
    
    # Create the install commands file
    commands_success = create_postgres_install_commands()
    
    # Create deployment instructions
    instructions_success = create_deployment_instructions()
    
    # Check if all operations were successful
    if prebuild_success and packages_success and commands_success and instructions_success:
        print("\n=== Fix completed successfully ===")
        print("Next steps:")
        print("1. Regenerate the deployment package with:")
        print("   cd /Users/kuoldeng/projectx/backend/pyfactor")
        print("   ./scripts/prepare_eb_package.sh")
        print("2. Upload the new package to Elastic Beanstalk")
        return 0
    else:
        print("\n=== Fix completed with warnings ===")
        print("Please review the output above for details")
        return 1

if __name__ == "__main__":
    main()
