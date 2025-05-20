#!/usr/bin/env python3
"""
Version0013_fix_postgresql_package.py - Fix PostgreSQL package name for Amazon Linux 2023

This script addresses the deployment error: "Yum does not have postgresql-devel available for installation"
by updating the package name to use the correct one for Amazon Linux 2023.

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
    """Update the prebuild hook script to handle PostgreSQL packages properly for Amazon Linux 2023."""
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
    
    # Find and replace the postgresql-devel installation line
    old_code = """# Install PostgreSQL libraries if needed (for non-binary psycopg2)
echo "Ensuring PostgreSQL libraries are installed"
which yum > /dev/null && {
    yum list installed | grep -qw postgresql-devel || sudo yum install -y postgresql-devel
}"""

    new_code = """# Install PostgreSQL libraries if needed (for non-binary psycopg2)
echo "Ensuring PostgreSQL libraries are installed"
which yum > /dev/null && {
    # Detect Amazon Linux version
    if grep -q "Amazon Linux release 2023" /etc/os-release; then
        echo "Detected Amazon Linux 2023 - using postgresql15-devel package"
        yum list installed | grep -qw postgresql15-devel || sudo yum install -y postgresql15-devel || {
            echo "Failed to install postgresql15-devel, trying postgresql-server-devel"
            sudo yum install -y postgresql-server-devel
        }
    else
        echo "Detected Amazon Linux 2 or other - using postgresql-devel package"
        yum list installed | grep -qw postgresql-devel || sudo yum install -y postgresql-devel
    fi
}"""

    # Replace the code
    if old_code in content:
        new_content = content.replace(old_code, new_code)
        
        # Write the updated content
        with open(install_script, 'w') as f:
            f.write(new_content)
        
        print(f"Successfully updated {install_script}")
        return True
    else:
        print("Warning: Could not find the expected code section. Manual review required.")
        print("Looking for alternative patterns...")
        
        # Try a more flexible approach to find and replace the PostgreSQL section
        import re
        
        postgresql_pattern = re.compile(r'# Install PostgreSQL libraries.*?postgresql-devel\s*\}\s*', re.DOTALL)
        match = postgresql_pattern.search(content)
        
        if match:
            # Found a matching section using regex
            matched_text = match.group(0)
            new_content = content.replace(matched_text, new_code + "\n\n")
            
            # Write the updated content
            with open(install_script, 'w') as f:
                f.write(new_content)
            
            print(f"Successfully updated {install_script} using pattern matching")
            return True
        else:
            print("Error: Could not locate PostgreSQL installation section in the script.")
            return False

def update_packages_config():
    """Update the .ebextensions packages configuration."""
    config_path = Path("/Users/kuoldeng/projectx/backend/pyfactor/.ebextensions/02_packages.config")
    
    if not config_path.exists():
        print(f"Error: Config file not found at {config_path}")
        return False
    
    # Create a backup
    create_backup(config_path)
    
    # Read the current content
    with open(config_path, 'r') as f:
        content = f.read()
    
    # Update the content to include conditional package installation
    new_content = """packages:
  yum:
    gcc-c++: []
    libpq-devel: []
    python3-devel: []
    # Either postgresql15-devel or postgresql-server-devel will be needed on Amazon Linux 2023
    postgresql15-devel: []
"""
    
    # Write the updated content
    with open(config_path, 'w') as f:
        f.write(new_content)
    
    print(f"Successfully updated {config_path}")
    return True

def create_deployment_instructions():
    """Create a README file with deployment instructions."""
    instructions_path = Path("/Users/kuoldeng/projectx/backend/pyfactor/scripts/PostgreSQL_Package_Fix.md")
    
    instructions = """# PostgreSQL Package Fix for Amazon Linux 2023

## Problem

The Elastic Beanstalk deployment failed with the error:
```
Error occurred during build: Yum does not have postgresql-devel available for installation
```

This occurred because Amazon Linux 2023 uses different package names for PostgreSQL development libraries compared to Amazon Linux 2.

## Solution

This fix implements two changes:

1. Updated the `.platform/hooks/prebuild/01_install_dependencies.sh` script to:
   - Detect the Amazon Linux version
   - Install the appropriate PostgreSQL development package:
     - `postgresql15-devel` for Amazon Linux 2023
     - `postgresql-devel` for Amazon Linux 2

2. Updated the `.ebextensions/02_packages.config` to include `postgresql15-devel`

## Deployment Instructions

1. Regenerate the deployment package:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor
   ./scripts/prepare_eb_package.sh
   ```

2. Upload the new package through the Elastic Beanstalk Console

3. If you encounter other dependency issues, check the logs for specific package names that might be different in Amazon Linux 2023.

## Additional Notes

Amazon Linux 2023 has several package name changes compared to Amazon Linux 2:
- `postgresql-devel` → `postgresql15-devel` or `postgresql-server-devel`
- Some packages may require enabling additional repositories using `amazon-linux-extras`

For a complete list of package differences, refer to the [Amazon Linux 2023
documentation](https://docs.aws.amazon.com/linux/al2023/ug/compare-with-al2.html).
"""
    
    # Write the instructions
    with open(instructions_path, 'w') as f:
        f.write(instructions)
    
    print(f"Created instructions at {instructions_path}")
    return True

def update_script_registry():
    """Add an entry to the script registry."""
    registry_path = Path("/Users/kuoldeng/projectx/backend/pyfactor/scripts/script_registry.js")
    
    if not registry_path.exists():
        print(f"Warning: Script registry not found at {registry_path}")
        return False
    
    # Read the current content
    with open(registry_path, 'r') as f:
        content = f.read()
    
    # Find the scripts array
    import re
    scripts_array_pattern = re.compile(r'const scripts = \[\s*(.*?)\s*\];', re.DOTALL)
    match = scripts_array_pattern.search(content)
    
    if not match:
        print("Warning: Could not find scripts array in registry")
        return False
    
    # Extract the scripts array content
    scripts_content = match.group(1)
    
    # Create new script entry
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    new_script_entry = f"""  {{
    id: "Version0013_fix_postgresql_package",
    description: "Fix PostgreSQL package name for Amazon Linux 2023",
    created: "{today}",
    status: "completed",
    author: "Cline",
    category: "deployment",
    tags: ["aws", "elastic-beanstalk", "deployment", "postgresql"]
  }},"""
    
    # Insert the new entry at the beginning of the array
    updated_scripts_content = new_script_entry + "\n  " + scripts_content
    
    # Replace the scripts array content
    updated_content = content.replace(scripts_content, updated_scripts_content)
    
    # Write the updated content
    with open(registry_path, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated script registry at {registry_path}")
    return True

def main():
    """Main function to execute all fix steps."""
    print("=== Starting Version0013_fix_postgresql_package.py ===")
    
    # Fix the prebuild hook script
    prebuild_success = fix_prebuild_hook()
    
    # Update the packages configuration
    packages_success = update_packages_config()
    
    # Create deployment instructions
    instructions_success = create_deployment_instructions()
    
    # Update script registry
    registry_success = update_script_registry()
    
    # Check if all operations were successful
    if prebuild_success and packages_success and instructions_success:
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
