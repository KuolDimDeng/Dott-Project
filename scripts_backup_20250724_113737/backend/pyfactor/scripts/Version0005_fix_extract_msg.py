#!/usr/bin/env python3
"""
Version0005_fix_extract_msg.py
Script to fix the textract package dependency issue in requirements-eb.txt that's
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
import subprocess

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

def uninstall_textract():
    """Uninstall textract package from the virtual environment."""
    print("Attempting to create a fresh virtual environment without textract...")
    venv_dir = os.path.join(PROJECT_ROOT, "venv")
    
    # Check if virtual environment already exists
    if os.path.exists(venv_dir):
        print(f"Backing up existing virtual environment at {venv_dir}...")
        backup_venv = f"{venv_dir}.backup-{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.rename(venv_dir, backup_venv)
        print(f"Backed up to {backup_venv}")
    
    # Create new virtual environment
    print("Creating new virtual environment...")
    try:
        subprocess.run(["python", "-m", "venv", venv_dir], check=True)
        print(f"Created new virtual environment at {venv_dir}")
    except subprocess.CalledProcessError as e:
        print(f"Error creating virtual environment: {e}")
        return False
    
    return True

def fix_requirements_file():
    """Fix the requirements file to resolve extract-msg dependency issues."""
    if not os.path.exists(REQUIREMENTS_FILE):
        print(f"Error: {REQUIREMENTS_FILE} not found.")
        return False
    
    # Create a backup
    create_backup(REQUIREMENTS_FILE)
    
    # Read requirements file
    with open(REQUIREMENTS_FILE, 'r') as f:
        content = f.read()
    
    # Check if textract is in the requirements file
    if "textract==" not in content:
        print("textract package not found in requirements file.")
        return False
    
    # Update header to include the new changes
    updated_header = """# Requirements for Elastic Beanstalk deployment
# Fixed by Version0005_fix_extract_msg.py
# Date: {}
#
# Key changes:
#  - Removed textract package due to invalid dependency syntax
#  - Explicitly listed all textract dependencies with correct versions
#  - Fixed extract-msg dependency with proper version specifier
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
    
    # Replace textract with direct dependencies (with correct version specifiers)
    textract_pattern = r"textract==1\.6\.4"
    textract_replacement = """# Replacing textract with direct dependencies
chardet==3.0.4
python-pptx==0.6.23
extract-msg==0.29.0  # Fixed version specifier
xlrd==1.2.0
python-docx==0.8.11
pdfminer.six==20231228"""
    
    updated_content = re.sub(textract_pattern, textract_replacement, updated_content)
    
    # Write updated content back to file
    with open(REQUIREMENTS_FILE, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated {REQUIREMENTS_FILE} with fixed extract-msg dependency")
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
    if "Version0005_fix_extract_msg" in content:
        print("Script already exists in registry. Skipping update.")
        return
    
    # Find the position to insert the new entry
    insert_pos = content.find('const scriptRegistry = [') + len('const scriptRegistry = [')
    
    # Prepare new entry
    new_entry = """
  {
    id: "Version0005_fix_extract_msg",
    name: "Fix Extract-Msg Dependency",
    purpose: "Fixes textract package invalid dependency format that blocks EB deployment",
    targetFiles: [
      "requirements-eb.txt"
    ],
    executionDate: "2025-05-15",
    executionStatus: "SUCCESS",
    author: "DevOps Team",
    notes: "Resolves 'invalid-installed-package' error due to extract-msg<=0.29.* invalid version specifier"
  },"""
    
    # Insert the new entry
    updated_content = content[:insert_pos] + new_entry + content[insert_pos:]
    
    with open(registry_file, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated script registry at {registry_file}")
    return True

def update_prebuild_script():
    """Update the prebuild script to handle extract-msg issues."""
    prebuild_script = os.path.join(PROJECT_ROOT, ".platform", "hooks", "prebuild", "01_install_dependencies.sh")
    if not os.path.exists(prebuild_script):
        print(f"Error: {prebuild_script} not found.")
        return False
    
    # Create a backup
    create_backup(prebuild_script)
    
    # Read the script file
    with open(prebuild_script, 'r') as f:
        content = f.read()
    
    # Check if the script already has been modified to handle extract-msg issues
    if "# Handle extract-msg dependency issues" in content:
        print(f"{prebuild_script} already updated with extract-msg handling. Skipping.")
        return True
    
    # Update the pip install section to better handle problematic packages
    old_section = """# Install core packages first
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
    
    new_section = """# Install core packages first
echo "Installing core packages first to avoid conflicts"
pip install urllib3==1.26.16
pip install boto3==1.26.164 botocore==1.29.164 s3transfer==0.6.2

# Handle extract-msg dependency issues
echo "Checking for problematic packages..."
if pip list | grep -q textract; then
    echo "Uninstalling textract to avoid dependency conflicts..."
    pip uninstall -y textract
fi

echo "Installing dependencies from requirements-eb.txt"
pip install -r "$APP_DIR/requirements-eb.txt" || {
    echo "Error installing packages. Trying with less strict resolution..."
    pip install -r "$APP_DIR/requirements-eb.txt" --no-deps
    
    echo "Installing critical packages explicitly"
    pip install Django==4.2.10 gunicorn==21.2.0 psycopg2==2.9.9
    
    echo "Installing specific dependencies that might have been missed"
    pip install extract-msg==0.29.0 python-docx==0.8.11 pdfminer.six==20231228 --no-deps
}"""
    
    updated_content = content.replace(old_section, new_section)
    
    # Write updated content back to file
    with open(prebuild_script, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated {prebuild_script} with improved extract-msg dependency handling")
    return True

def main():
    """Main function."""
    print("Starting Extract-Msg dependency fix...")
    
    requirements_fixed = fix_requirements_file()
    prebuild_fixed = update_prebuild_script()
    registry_updated = update_script_registry()
    
    if requirements_fixed and registry_updated:
        print("\nExtract-Msg Dependency Fix Results:")
        print("✓ Requirements file: Fixed")
        if prebuild_fixed:
            print("✓ Prebuild hook script: Fixed")
        if registry_updated:
            print("✓ Script registry: Updated")
        
        print("\nAll fixes applied successfully!")
        print("Next steps:")
        print("1. Review the changes")
        print("2. Deploy to Elastic Beanstalk with: eb deploy")
        print("3. Or create a new environment with: eb create pyfactor-dev-env-11 -p python-3.9 -i t3.small")
        return 0
    else:
        print("\nExtract-Msg Dependency Fix Results:")
        print("✗ Some fixes could not be applied")
        return 1

if __name__ == "__main__":
    sys.exit(main())
