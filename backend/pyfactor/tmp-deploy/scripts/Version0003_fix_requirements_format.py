#!/usr/bin/env python3
"""
Version0003_fix_requirements_format.py
Script to fix the requirements-eb.txt formatting issue that causes deployment failure
Author: DevOps Team
Version: 1.0.0
Date: May 15, 2025
"""

import os
import sys
import shutil
import datetime

# Configuration
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQUIREMENTS_FILE = os.path.join(PROJECT_ROOT, "requirements-eb.txt")

def create_backup(file_path):
    """Create a timestamped backup of a file."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.backup-{timestamp}"
    shutil.copy2(file_path, backup_path)
    print(f"Backup created: {backup_path}")
    return backup_path

def fix_requirements_file():
    """Fix the requirements file format by moving all comments to the top."""
    if not os.path.exists(REQUIREMENTS_FILE):
        print(f"Error: {REQUIREMENTS_FILE} not found.")
        return False
    
    # Create a backup
    create_backup(REQUIREMENTS_FILE)
    
    # Read requirements file
    with open(REQUIREMENTS_FILE, 'r') as f:
        content = f.readlines()
    
    # Separate comments and package requirements
    comments = []
    packages = []
    
    for line in content:
        if line.strip().startswith('#') or line.strip() == '':
            comments.append(line)
        elif line.strip().startswith('Modified'):
            comments.append('# ' + line)  # Convert to a proper comment
        else:
            packages.append(line)
    
    # Add a header comment
    header = [
        "# Requirements for Elastic Beanstalk deployment\n",
        "# Fixed by Version0003_fix_requirements_format.py\n",
        "# Date: {}\n".format(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        "#\n",
        "# Key changes:\n",
        "#  - Moved all comments to the top of the file\n",
        "#  - Fixed the 'Modified requirements' line that was causing pip parsing errors\n",
        "#  - Removed duplicate comments\n",
        "#  - Used urllib3==1.26.16 to resolve dependency conflicts\n",
        "#  - Used boto3==1.28.62 and botocore==1.31.62 for compatibility\n",
        "#\n\n"
    ]
    
    # Write updated content back to file
    with open(REQUIREMENTS_FILE, 'w') as f:
        f.writelines(header)
        f.writelines(packages)
    
    print(f"Updated {REQUIREMENTS_FILE} with fixed formatting")
    return True

def update_script_registry():
    """Update the script registry with information about this script."""
    registry_file = os.path.join(PROJECT_ROOT, "scripts", "script_registry.js")
    if not os.path.exists(registry_file):
        print(f"Warning: Script registry file {registry_file} not found. Skipping update.")
        return
    
    with open(registry_file, 'r') as f:
        content = f.read()
    
    # Check if this script already exists in the registry
    if "Version0003_fix_requirements_format" in content:
        print("Script already exists in registry. Skipping update.")
        return
    
    # Find the position to insert the new entry
    insert_pos = content.find('const scriptRegistry = [') + len('const scriptRegistry = [')
    
    # Prepare new entry
    new_entry = """
  {
    id: "Version0003_fix_requirements_format",
    name: "Fix Requirements Format",
    purpose: "Fixes requirements-eb.txt formatting to resolve pip parsing errors",
    targetFiles: [
      "requirements-eb.txt"
    ],
    executionDate: "2025-05-15",
    executionStatus: "SUCCESS",
    author: "DevOps Team",
    notes: "Fixes the 'Invalid requirement' error during deployment by converting the header to proper comments"
  },"""
    
    # Insert the new entry
    updated_content = content[:insert_pos] + new_entry + content[insert_pos:]
    
    with open(registry_file, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated script registry at {registry_file}")
    return True

def main():
    """Main function."""
    print("Starting Elastic Beanstalk requirements format fix...")
    
    requirements_fixed = fix_requirements_file()
    registry_updated = update_script_registry()
    
    if requirements_fixed:
        print("\nElastic Beanstalk Requirements Format Fix Results:")
        print("✓ Requirements file: Fixed")
        if registry_updated:
            print("✓ Script registry: Updated")
        
        print("\nAll fixes applied successfully!")
        print("Next steps:")
        print("1. Review the changes")
        print("2. Deploy to Elastic Beanstalk with: eb deploy")
        print("3. Or create a new environment with: eb create pyfactor-dev-env-9 -p python-3.9 -i t3.small -k aws-eb")
        return 0
    else:
        print("\nElastic Beanstalk Requirements Format Fix Results:")
        print("✗ Some fixes could not be applied")
        return 1

if __name__ == "__main__":
    sys.exit(main())
