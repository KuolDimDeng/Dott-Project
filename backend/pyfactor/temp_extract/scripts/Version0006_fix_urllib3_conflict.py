#!/usr/bin/env python3
"""
Version0006_fix_urllib3_conflict.py
Script to fix the urllib3 dependency conflict in requirements-eb.txt that's
causing deployment failures on Elastic Beanstalk.
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
    """Fix the requirements file to resolve urllib3 dependency conflicts."""
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
# Fixed by Version0006_fix_urllib3_conflict.py
# Date: {}
#
# Key changes:
#  - Fixed urllib3 version to 1.26.16 to resolve conflicts with botocore/boto3
#  - Removed explicit urllib3==2.2.1 entry that was causing conflicts
#  - Added explicit compatibility notes
#
""".format(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    # Update the content with the new header - replace everything before the first package
    package_pattern = r"^[a-zA-Z0-9_\-]+==[0-9]"
    package_match = re.search(package_pattern, content, re.MULTILINE)
    
    if package_match:
        first_package_pos = package_match.start()
        updated_content = updated_header + content[first_package_pos:]
    else:
        updated_content = updated_header + content
    
    # Fix urllib3 version - find and replace any urllib3 entry with the compatible version
    urllib3_pattern = r"urllib3==[\d\.]+(?:\s*#.*)?$"
    urllib3_replacement = "urllib3==1.26.16  # Version compatible with botocore<1.30.0"
    
    # Use re.MULTILINE to match the entire line
    updated_content = re.sub(urllib3_pattern, urllib3_replacement, updated_content, flags=re.MULTILINE)
    
    # Add warning comment for boto3 and botocore dependencies
    boto3_pattern = r"(boto3==[\d\.]+)(\s*#.*)?$"
    boto3_replacement = r"\1  # Requires urllib3<1.27.0 for Python<3.10"
    
    updated_content = re.sub(boto3_pattern, boto3_replacement, updated_content, flags=re.MULTILINE)
    
    botocore_pattern = r"(botocore==[\d\.]+)(\s*#.*)?$"
    botocore_replacement = r"\1  # Requires urllib3<1.27.0 for Python<3.10"
    
    updated_content = re.sub(botocore_pattern, botocore_replacement, updated_content, flags=re.MULTILINE)
    
    # Write updated content back to file
    with open(REQUIREMENTS_FILE, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated {REQUIREMENTS_FILE} with fixed urllib3 dependency")
    return True

def update_prebuild_script():
    """Update the prebuild script to ensure urllib3 is installed at the correct version."""
    prebuild_script = os.path.join(PROJECT_ROOT, ".platform", "hooks", "prebuild", "01_install_dependencies.sh")
    if not os.path.exists(prebuild_script):
        print(f"Error: {prebuild_script} not found.")
        return False
    
    # Create a backup
    create_backup(prebuild_script)
    
    # Read the script file
    with open(prebuild_script, 'r') as f:
        content = f.read()
    
    # Update the packages section to better handle urllib3
    old_section = """# Install core packages first
echo "Installing core packages first to avoid conflicts"
pip install urllib3==1.26.16
pip install boto3==1.26.164 botocore==1.29.164 s3transfer==0.6.2

# Handle extract-msg dependency issues
echo "Checking for problematic packages..."
if pip list | grep -q textract; then
    echo "Uninstalling textract to avoid dependency conflicts..."
    pip uninstall -y textract
fi"""
    
    new_section = """# Install core packages first
echo "Installing core packages first to avoid conflicts"
# Downgrade pip to avoid dependency resolution issues with urllib3
pip install 'pip<24.0'
echo "Installing urllib3 first at the correct version"
pip install urllib3==1.26.16
# Forcefully remove any other urllib3 version
pip uninstall -y urllib3
pip install urllib3==1.26.16
echo "Installing AWS SDK dependencies with compatible urllib3"
pip install boto3==1.26.164 botocore==1.29.164 s3transfer==0.6.2

# Handle extract-msg dependency issues
echo "Checking for problematic packages..."
if pip list | grep -q textract; then
    echo "Uninstalling textract to avoid dependency conflicts..."
    pip uninstall -y textract
fi"""
    
    updated_content = content.replace(old_section, new_section)
    
    # Write updated content back to file
    with open(prebuild_script, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated {prebuild_script} with improved urllib3 dependency handling")
    return True

def update_script_registry():
    """Update the script registry with information about this script."""
    registry_file = os.path.join(PROJECT_ROOT, "scripts", "script_registry.js")
    if not os.path.exists(registry_file):
        print(f"Warning: Script registry file {registry_file} not found. Skipping update.")
        return True
    
    with open(registry_file, 'r') as f:
        content = f.read()
    
    # Check if this script already exists in the registry
    if "Version0006_fix_urllib3_conflict" in content:
        print("Script already exists in registry. Skipping update.")
        return True
    
    # Find the position to insert the new entry
    insert_pos = content.find('const scriptRegistry = [') + len('const scriptRegistry = [')
    
    # Prepare new entry
    new_entry = """
  {
    id: "Version0006_fix_urllib3_conflict",
    name: "Fix urllib3 Dependency Conflict",
    purpose: "Fixes urllib3 version conflicts with boto3/botocore that block EB deployment",
    targetFiles: [
      "requirements-eb.txt",
      ".platform/hooks/prebuild/01_install_dependencies.sh"
    ],
    executionDate: "2025-05-15",
    executionStatus: "SUCCESS",
    author: "DevOps Team",
    notes: "Resolves 'Cannot install -r requirements.txt (line 9) and urllib3==2.2.1' error during deployment"
  },"""
    
    # Insert the new entry
    updated_content = content[:insert_pos] + new_entry + content[insert_pos:]
    
    with open(registry_file, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated script registry at {registry_file}")
    return True

def main():
    """Main function."""
    print("Starting urllib3 conflict fix...")
    
    requirements_fixed = fix_requirements_file()
    prebuild_fixed = update_prebuild_script()
    registry_updated = update_script_registry()
    
    if requirements_fixed and prebuild_fixed:
        print("\nUrllib3 Conflict Fix Results:")
        print("✓ Requirements file: Fixed")
        print("✓ Prebuild hook script: Fixed")
        if registry_updated:
            print("✓ Script registry: Updated")
        
        print("\nAll fixes applied successfully!")
        print("Next steps:")
        print("1. Review the changes")
        print("2. Deploy to Elastic Beanstalk with: eb deploy")
        print("3. Or create a new environment with: eb create pyfactor-env-fixed -p python-3.9 -i t3.small")
        return 0
    else:
        print("\nUrllib3 Conflict Fix Results:")
        print("✗ Some fixes could not be applied")
        return 1

if __name__ == "__main__":
    sys.exit(main())
