#!/usr/bin/env python3
"""
Version0002_fix_dependencies_conflict.py
Script to fix dependency conflicts in requirements-eb.txt
Resolves conflicts with urllib3 and other packages
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
PREBUILD_SCRIPT = os.path.join(PROJECT_ROOT, ".platform", "hooks", "prebuild", "01_install_dependencies.sh")

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
    
    # Clean up duplicate comments
    comment_pattern = r"# Fixed by Version0001_fix_eb_deployment\.py[\s\S]*?# Pinned pip to version compatible with Python 3\.9\n"
    cleaned_content = re.sub(comment_pattern, "", content, flags=re.MULTILINE)
    
    # Add a single comment header
    header = """Modified requirements for Elastic Beanstalk deployment
# Fixed by Version0002_fix_dependencies_conflict.py
# Changes:
#  - Downgraded textract to 1.6.4 to avoid metadata issues
#  - Fixed extract-msg version syntax
#  - Pinned pip to version compatible with Python 3.9
#  - Changed urllib3 version to 1.26.16 to resolve dependency conflicts
#  - Added package constraints to avoid conflicts

"""
    
    # Update the content with the new header
    if cleaned_content.startswith("Modified requirements"):
        # Replace existing header
        cleaned_content = re.sub(r"Modified requirements[\s\S]*?\n\n", header, cleaned_content, count=1)
    else:
        # Add header at the beginning
        cleaned_content = header + cleaned_content
    
    # Fix urllib3 version - downgrade to avoid conflicts
    cleaned_content = re.sub(r"urllib3==2\.2\.1", "urllib3==1.26.16", cleaned_content)
    
    # Fix boto3 and botocore versions to be compatible with urllib3 1.26.16
    cleaned_content = re.sub(r"boto3==1\.34\.113", "boto3==1.28.62", cleaned_content)
    cleaned_content = re.sub(r"botocore==1\.34\.113", "botocore==1.31.62", cleaned_content)
    
    # Remove any duplicate entries
    lines = cleaned_content.split('\n')
    packages = {}
    filtered_lines = []
    
    for line in lines:
        # Skip empty lines
        if not line.strip():
            filtered_lines.append(line)
            continue
            
        # Skip comments
        if line.strip().startswith('#'):
            filtered_lines.append(line)
            continue
            
        # Parse package name and version
        match = re.match(r'^([a-zA-Z0-9_\-]+)==', line)
        if match:
            package_name = match.group(1).lower()
            if package_name not in packages:
                packages[package_name] = True
                filtered_lines.append(line)
        else:
            filtered_lines.append(line)
    
    # Write updated content back to file
    with open(REQUIREMENTS_FILE, 'w') as f:
        f.write('\n'.join(filtered_lines))
    
    print(f"Updated {REQUIREMENTS_FILE} with fixed dependencies")
    return True

def update_prebuild_script():
    """Update the prebuild script to handle dependency conflicts better."""
    if not os.path.exists(PREBUILD_SCRIPT):
        print(f"Error: {PREBUILD_SCRIPT} not found.")
        return False
    
    # Create a backup
    create_backup(PREBUILD_SCRIPT)
    
    # Read the script file
    with open(PREBUILD_SCRIPT, 'r') as f:
        content = f.read()
    
    # Update the pip install command to include --no-deps for critical packages
    updated_content = content.replace(
        'pip install -r "$APP_DIR/requirements-eb.txt"',
        'echo "Installing urllib3 first to avoid conflicts"\n'
        'pip install urllib3==1.26.16\n'
        'echo "Installing dependencies from requirements-eb.txt"\n'
        'pip install -r "$APP_DIR/requirements-eb.txt" || {\n'
        '    echo "Error installing packages. Trying with less strict resolution..."\n'
        '    pip install -r "$APP_DIR/requirements-eb.txt" --no-deps\n'
        '    # Install critical packages explicitly\n'
        '    pip install Django==4.2.10 gunicorn==21.2.0 psycopg2==2.9.9\n'
        '}'
    )
    
    # Write updated content back to file
    with open(PREBUILD_SCRIPT, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated {PREBUILD_SCRIPT} with improved dependency handling")
    return True

def main():
    """Main function."""
    print("Starting Elastic Beanstalk dependency conflict fix...")
    
    requirements_fixed = fix_requirements_file()
    prebuild_fixed = update_prebuild_script()
    
    if requirements_fixed and prebuild_fixed:
        print("\nElastic Beanstalk Deployment Fix Results:")
        print("✓ Requirements file: Fixed")
        print("✓ Prebuild hook script: Fixed")
        print("\nAll fixes applied successfully!")
        print("Next steps:")
        print("1. Review the changes")
        print("2. Deploy to Elastic Beanstalk with: eb deploy")
        print("3. If needed, create a new environment with: eb create pyfactor-dev-env-7 -p python-3.9 -i t3.small -k aws-eb")
        return 0
    else:
        print("\nElastic Beanstalk Deployment Fix Results:")
        print("✗ Some fixes could not be applied")
        return 1

if __name__ == "__main__":
    sys.exit(main())
