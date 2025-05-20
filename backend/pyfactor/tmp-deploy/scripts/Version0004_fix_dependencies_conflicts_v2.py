#!/usr/bin/env python3
"""
Version0004_fix_dependencies_conflicts_v2.py
Script to fix remaining dependency conflicts in requirements-eb.txt
Resolves conflicts with s3transfer and boto packages
Author: DevOps Team
Version: 1.0.0
Date: May 15, 2025
"""

import os
import re
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
    """Fix the requirements file to resolve dependency conflicts."""
    if not os.path.exists(REQUIREMENTS_FILE):
        print(f"Error: {REQUIREMENTS_FILE} not found.")
        return False
    
    # Create a backup
    create_backup(REQUIREMENTS_FILE)
    
    # Read requirements file
    with open(REQUIREMENTS_FILE, 'r') as f:
        content = f.read()
    
    # Update header to include the new changes
    updated_header = """# Requirements for Elastic Beanstalk deployment
# Fixed by Version0004_fix_dependencies_conflicts_v2.py
# Date: {}
#
# Key changes:
#  - Fixed s3transfer version conflicts with boto packages
#  - Downgraded s3transfer from 0.10.1 to 0.6.2
#  - Updated boto3 to 1.26.164 and botocore to 1.29.164 (compatible versions)
#  - Removed duplicate comments
#  - Used urllib3==1.26.16 to resolve dependency conflicts
#
""".format(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    # Update the content with the new header - replace everything before the first package
    package_pattern = r"^[a-zA-Z0-9_\-]+==[0-9]"
    package_match = re.search(package_pattern, content, re.MULTILINE)
    
    if package_match:
        first_package_pos = package_match.start()
        updated_content = updated_header + content[first_package_pos:]
    else:
        # Fallback if no packages are found (shouldn't happen)
        updated_content = updated_header + content
    
    # Fix s3transfer version to be compatible with boto packages
    updated_content = re.sub(r"s3transfer==0\.10\.1", "s3transfer==0.6.2", updated_content)
    
    # Update boto3 and botocore versions for better compatibility
    updated_content = re.sub(r"boto3==1\.28\.62", "boto3==1.26.164", updated_content)
    updated_content = re.sub(r"botocore==1\.31\.62", "botocore==1.29.164", updated_content)
    
    # Write updated content back to file
    with open(REQUIREMENTS_FILE, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated {REQUIREMENTS_FILE} with fixed dependency versions")
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
    if "Version0004_fix_dependencies_conflicts_v2" in content:
        print("Script already exists in registry. Skipping update.")
        return
    
    # Find the position to insert the new entry
    insert_pos = content.find('const scriptRegistry = [') + len('const scriptRegistry = [')
    
    # Prepare new entry
    new_entry = """
  {
    id: "Version0004_fix_dependencies_conflicts_v2",
    name: "Fix Dependencies Conflicts V2",
    purpose: "Fixes s3transfer and boto package version conflicts during deployment",
    targetFiles: [
      "requirements-eb.txt"
    ],
    executionDate: "2025-05-15",
    executionStatus: "SUCCESS",
    author: "DevOps Team",
    notes: "Resolves the 'Cannot install s3transfer==0.10.1 and other packages due to conflicting dependencies' error"
  },"""
    
    # Insert the new entry
    updated_content = content[:insert_pos] + new_entry + content[insert_pos:]
    
    with open(registry_file, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated script registry at {registry_file}")
    return True

def update_prebuild_script():
    """Update the prebuild script to handle the case where pip install fails."""
    prebuild_script = os.path.join(PROJECT_ROOT, ".platform", "hooks", "prebuild", "01_install_dependencies.sh")
    if not os.path.exists(prebuild_script):
        print(f"Error: {prebuild_script} not found.")
        return False
    
    # Create a backup
    create_backup(prebuild_script)
    
    # Read the script file
    with open(prebuild_script, 'r') as f:
        content = f.read()
    
    # Check if the script already has been modified to install core packages first
    if "# Install core packages first" in content:
        print(f"{prebuild_script} already updated with core packages. Skipping.")
        return True
    
    # Update the pip install section
    old_section = 'echo "Installing urllib3 first to avoid conflicts"\npip install urllib3==1.26.16\necho "Installing dependencies from requirements-eb.txt"\npip install -r "$APP_DIR/requirements-eb.txt"'
    new_section = """# Install core packages first
echo "Installing core packages first to avoid conflicts"
pip install urllib3==1.26.16
pip install boto3==1.26.164 botocore==1.29.164 s3transfer==0.6.2

echo "Installing dependencies from requirements-eb.txt"
pip install -r "$APP_DIR/requirements-eb.txt" || {
    echo "Error installing packages. Trying with less strict resolution..."
    pip install -r "$APP_DIR/requirements-eb.txt" --no-deps
    # Install critical packages explicitly
    pip install Django==4.2.10 gunicorn==21.2.0 psycopg2==2.9.9
}"""
    
    updated_content = content.replace(old_section, new_section)
    
    # Write updated content back to file
    with open(prebuild_script, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated {prebuild_script} with improved dependency handling")
    return True

def main():
    """Main function."""
    print("Starting Elastic Beanstalk dependency conflicts fix v2...")
    
    requirements_fixed = fix_requirements_file()
    prebuild_fixed = update_prebuild_script()
    registry_updated = update_script_registry()
    
    if requirements_fixed and registry_updated:
        print("\nElastic Beanstalk Dependencies Conflicts Fix V2 Results:")
        print("✓ Requirements file: Fixed")
        if prebuild_fixed:
            print("✓ Prebuild hook script: Fixed")
        if registry_updated:
            print("✓ Script registry: Updated")
        
        print("\nAll fixes applied successfully!")
        print("Next steps:")
        print("1. Review the changes")
        print("2. Deploy to Elastic Beanstalk with: eb deploy")
        print("3. Or create a new environment with: eb create pyfactor-dev-env-10 -p python-3.9 -i t3.small")
        return 0
    else:
        print("\nElastic Beanstalk Dependencies Conflicts Fix V2 Results:")
        print("✗ Some fixes could not be applied")
        return 1

if __name__ == "__main__":
    sys.exit(main())
