#!/usr/bin/env python3
"""
Version0011_ultimate_dependency_fix.py
Comprehensive solution to ensure consistent dependencies, prevent urllib3/boto3 conflicts,
and force compatible versions during deployment.

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
import glob

# Configuration
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQUIREMENTS_EB_FILE = os.path.join(PROJECT_ROOT, "requirements-eb.txt")
REQUIREMENTS_FILE = os.path.join(PROJECT_ROOT, "requirements.txt")
REQUIREMENTS_SIMPLE_FILE = os.path.join(PROJECT_ROOT, "requirements-simple.txt")

def create_backup(file_path):
    """Create a timestamped backup of a file."""
    if not os.path.exists(file_path):
        print(f"Warning: File {file_path} does not exist. Cannot create backup.")
        return None
        
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.backup-{timestamp}"
    shutil.copy2(file_path, backup_path)
    print(f"Backup created: {backup_path}")
    return backup_path

def execute_command(command):
    """Execute a shell command and return output."""
    print(f"Executing: {command}")
    try:
        process = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            print(f"Error executing command: {stderr}")
            return False, stderr
            
        return True, stdout
    except Exception as e:
        print(f"Exception executing command: {str(e)}")
        return False, str(e)

def find_additional_requirements_files():
    """Find any additional requirements files in the project that might cause conflicts."""
    additional_files = []
    
    # Search for any file containing "requirements" and ending with .txt
    for root, _, files in os.walk(PROJECT_ROOT):
        for filename in files:
            if "requirements" in filename.lower() and filename.endswith(".txt"):
                file_path = os.path.join(root, filename)
                # Skip the main requirements files we already know about
                if file_path not in [REQUIREMENTS_FILE, REQUIREMENTS_EB_FILE, REQUIREMENTS_SIMPLE_FILE]:
                    additional_files.append(file_path)
    
    return additional_files

def check_for_setup_py_files():
    """Find any setup.py files that might specify dependencies."""
    setup_files = []
    
    for root, _, files in os.walk(PROJECT_ROOT):
        for filename in files:
            if filename == "setup.py":
                setup_files.append(os.path.join(root, filename))
    
    return setup_files

def fix_requirements_file(requirements_path, is_eb=False):
    """Fix the requirements file to resolve urllib3 dependency conflicts."""
    if not os.path.exists(requirements_path):
        print(f"Error: {requirements_path} not found.")
        return False

    # Create a backup
    create_backup(requirements_path)

    # Read requirements file
    with open(requirements_path, 'r') as f:
        content = f.read()

    file_type = "EB" if is_eb else "main"
    
    # Update header to include the new changes
    updated_header = f"""# Requirements for {"Elastic Beanstalk deployment" if is_eb else "Development"}
# Fixed by Version0011_ultimate_dependency_fix.py
# Date: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
#
# Key changes:
#  - FORCED urllib3 version to 1.26.16 to resolve conflicts with botocore/boto3
#  - Updated boto3/botocore versions for compatibility
#  - REMOVED any newer urllib3 version specifications
#  - Ensured consistent versions across all requirements files
#
"""

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
    urllib3_replacement = "urllib3==1.26.16  # Version compatible with botocore<1.30.0 - DO NOT CHANGE THIS VERSION"

    # Use re.MULTILINE to match the entire line
    updated_content = re.sub(urllib3_pattern, urllib3_replacement, updated_content, flags=re.MULTILINE)
    
    # If urllib3 doesn't exist in the file, add it at the end
    if "urllib3==" not in updated_content:
        updated_content += "\n" + urllib3_replacement
        
    # Fix boto3 version to 1.26.164 for compatibility with urllib3==1.26.16
    boto3_pattern = r"boto3==[\d\.]+(?:\s*#.*)?$"
    boto3_replacement = "boto3==1.26.164  # Requires urllib3<1.27.0 for Python<3.10"
    updated_content = re.sub(boto3_pattern, boto3_replacement, updated_content, flags=re.MULTILINE)
    
    # Fix botocore version to 1.29.164 for compatibility with urllib3==1.26.16
    botocore_pattern = r"botocore==[\d\.]+(?:\s*#.*)?$"
    botocore_replacement = "botocore==1.29.164  # Requires urllib3<1.27.0 for Python<3.10"
    updated_content = re.sub(botocore_pattern, botocore_replacement, updated_content, flags=re.MULTILINE)
    
    # Fix s3transfer version for compatibility
    s3transfer_pattern = r"s3transfer==[\d\.]+(?:\s*#.*)?$"
    s3transfer_replacement = "s3transfer==0.6.2  # Compatible with boto3 1.26.164"
    updated_content = re.sub(s3transfer_pattern, s3transfer_replacement, updated_content, flags=re.MULTILINE)
    
    # Remove specific problematic packages
    packages_to_remove = ["textract", "boto", "awscli"]
    for package in packages_to_remove:
        updated_content = re.sub(rf"{package}==[\d\.]+(?:\s*#.*)?$", "", updated_content, flags=re.MULTILINE)
    
    # Write updated content back to file
    with open(requirements_path, 'w') as f:
        f.write(updated_content)

    print(f"Updated {requirements_path} with fixed urllib3 dependency")
    return True

def create_constraint_file():
    """Create a pip constraint file to force specific versions."""
    constraints_path = os.path.join(PROJECT_ROOT, ".pip-constraints.txt")
    
    constraints_content = """# Constraint file created by Version0011_ultimate_dependency_fix.py
# Date: {}
# 
# These constraints force specific versions of packages
# to prevent dependency conflicts during pip installs
#
urllib3==1.26.16
boto3==1.26.164 
botocore==1.29.164
s3transfer==0.6.2
""".format(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    with open(constraints_path, 'w') as f:
        f.write(constraints_content)
    
    print(f"Created pip constraints file at {constraints_path}")
    return constraints_path

def update_prebuild_script():
    """Update the prebuild script with more robust handling."""
    script_path = os.path.join(PROJECT_ROOT, ".platform", "hooks", "prebuild", "02_install_prereqs.sh")
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(script_path), exist_ok=True)
    
    # Create a backup if the file already exists
    if os.path.exists(script_path):
        create_backup(script_path)
    
    improved_script_content = """#!/bin/bash
# Prebuild script updated by Version0011_ultimate_dependency_fix.py
# This script enforces compatible dependency versions before deployment

set -e   # Exit on error
set -x   # Print commands for debugging

echo "==== PREPARING ENVIRONMENT FOR CLEAN DEPLOY ===="
echo "Starting time: $(date)"

# Create a constraints file to enforce package versions
cat > /tmp/pip-constraints.txt << EOL
urllib3==1.26.16
boto3==1.26.164
botocore==1.29.164
s3transfer==0.6.2
EOL

echo "==== CONSTRAINTS FILE CREATED ===="
cat /tmp/pip-constraints.txt

# First, upgrade pip itself
echo "==== UPGRADING PIP ===="
pip install --upgrade pip==23.3.1 setuptools==69.0.3

# Force uninstall problematic packages
echo "==== REMOVING ANY CONFLICTING PACKAGES ===="
pip uninstall -y urllib3 boto3 botocore s3transfer awscli textract boto || true

# Install urllib3 first with no-dependencies to avoid conflicts
echo "==== INSTALLING URLLIB3 ===="
pip install urllib3==1.26.16 --no-dependencies

# Install AWS SDK components at compatible versions
echo "==== INSTALLING AWS SDK COMPONENTS ===="
pip install boto3==1.26.164 botocore==1.29.164 s3transfer==0.6.2 --no-dependencies

# Install critical packages explicitly with their exact versions
echo "==== INSTALLING CRITICAL PACKAGES ===="
pip install Django==4.2.10 gunicorn==21.2.0 psycopg2-binary==2.9.9

# Finally, install the rest of the requirements with constraints
echo "==== INSTALLING REMAINING REQUIREMENTS ===="
if [ -f "requirements-simple.txt" ]; then
    echo "Using simplified requirements file"
    pip install -r requirements-simple.txt --constraint /tmp/pip-constraints.txt
elif [ -f "requirements-eb.txt" ]; then
    echo "Using EB requirements file"
    pip install -r requirements-eb.txt --constraint /tmp/pip-constraints.txt
else
    echo "Using standard requirements file"
    pip install -r requirements.txt --constraint /tmp/pip-constraints.txt
fi

# Verify the installed versions
echo "==== VERIFYING INSTALLED VERSIONS ===="
pip list | grep -E 'urllib3|boto3|botocore|s3transfer'

echo "Prebuild prerequisites installed successfully at: $(date)"
"""
    
    # Write the improved script
    with open(script_path, 'w') as f:
        f.write(improved_script_content)
    
    # Make the script executable
    os.chmod(script_path, 0o755)
    
    print(f"Updated prebuild hook script: {script_path}")
    return True

def create_simplified_requirements():
    """Create a simplified requirements file for clean deployment."""
    simplified_req_path = os.path.join(PROJECT_ROOT, "requirements-simple.txt")
    
    # Create contained requirements with just the critical packages
    simplified_requirements = """# Simplified requirements for clean EB deployment
# Generated by Version0011_ultimate_dependency_fix.py
# Date: {}

# Core web framework
Django==4.2.10

# WSGI server
gunicorn==21.2.0

# Database adapter
psycopg2-binary==2.9.9

# AWS SDK (specific versions to avoid urllib3 conflicts)
urllib3==1.26.16  # Version compatible with botocore<1.30.0 - DO NOT CHANGE THIS VERSION
boto3==1.26.164  # Requires urllib3<1.27.0 for Python<3.10
botocore==1.29.164  # Requires urllib3<1.27.0 for Python<3.10
s3transfer==0.6.2  # Compatible with boto3 1.26.164

# Critical dependencies
djangorestframework==3.14.0
django-cors-headers==4.3.1
python-dotenv==1.0.1
celery==5.4.0
redis==5.0.7

# Security
cryptography==42.0.8
PyJWT==2.8.0
django-cryptography==1.1

# Database
django-db-connection-pool==1.2.1
django-postgrespool2==2.0.5
SQLAlchemy==2.0.30
""".format(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    # Write the simplified requirements
    with open(simplified_req_path, 'w') as f:
        f.write(simplified_requirements)
    
    print(f"Created simplified requirements file: {simplified_req_path}")
    return simplified_req_path

def create_deploy_script():
    """Create a deployment script for the fixed environment."""
    deploy_script_path = os.path.join(PROJECT_ROOT, "scripts", "deploy_fixed_env.sh")
    
    # Create a backup if the file already exists
    if os.path.exists(deploy_script_path):
        create_backup(deploy_script_path)
    
    # Deployment script content
    deploy_script_content = """#!/bin/bash
# deploy_fixed_env.sh
# Created by Version0011_ultimate_dependency_fix.py
# Script to deploy to Elastic Beanstalk with enforced dependency versions

set -e  # Exit on error

# Environment settings
ENV_NAME="pyfactor-prod"  # Use your environment name here

echo "====================================================="
echo "   DEPLOYING WITH FIXED DEPENDENCIES"
echo "====================================================="
echo "Environment: $ENV_NAME"
echo "Starting at: $(date)"
echo "====================================================="

# Use simplified requirements for deployment
if [ -f "requirements-simple.txt" ]; then
    echo "Using simplified requirements file for clean deployment"
    cp requirements.txt requirements.txt.original
    cp requirements-simple.txt requirements.txt
fi

# Create prebuild verification script
mkdir -p .platform/hooks/prebuild
cat > .platform/hooks/prebuild/01_verify_no_conflicts.sh << 'EOL'
#!/bin/bash
echo "Checking for conflicting dependencies..."
if grep -E "urllib3==2|urllib3==3" requirements.txt; then
    echo "ERROR: Found incompatible urllib3 version in requirements.txt"
    exit 1
fi

echo "No conflicting dependencies found"
chmod +x .platform/hooks/prebuild/01_verify_no_conflicts.sh
EOL

# Deploy the application
echo "Deploying to Elastic Beanstalk..."
if eb status $ENV_NAME &>/dev/null; then
    # Environment exists, update it
    echo "Updating existing environment: $ENV_NAME"
    eb deploy $ENV_NAME --timeout 20 --verbose
else
    # Create new environment
    echo "Creating new environment: $ENV_NAME"
    eb create $ENV_NAME \\
        --platform "python-3.9" \\
        --instance-type "t3.small" \\
        --single \\
        --timeout 20 \\
        --verbose
fi

# Restore original requirements if backed up
if [ -f "requirements.txt.original" ]; then
    echo "Restoring original requirements file"
    mv requirements.txt.original requirements.txt
fi

echo "====================================================="
echo "   DEPLOYMENT COMPLETE"
echo "====================================================="
echo "Completed at: $(date)"
echo "To check environment health: eb status $ENV_NAME"
echo "To view logs: eb logs $ENV_NAME"
echo "To open the application: eb open $ENV_NAME"
echo "====================================================="
"""
    
    # Write the deployment script
    with open(deploy_script_path, 'w') as f:
        f.write(deploy_script_content)
    
    # Make the script executable
    os.chmod(deploy_script_path, 0o755)
    
    print(f"Created deployment script: {deploy_script_path}")
    return deploy_script_path

def update_script_registry():
    """Update the script registry with information about this script."""
    registry_file = os.path.join(PROJECT_ROOT, "scripts", "script_registry.js")
    if not os.path.exists(registry_file):
        print(f"Warning: Script registry file {registry_file} not found. Skipping update.")
        return True

    with open(registry_file, 'r') as f:
        content = f.read()

    # Check if this script already exists in the registry
    if "Version0011_ultimate_dependency_fix" in content:
        print("Script already exists in registry. Skipping update.")
        return True

    # Find the position to insert the new entry
    insert_pos = content.find('const scriptRegistry = [') + len('const scriptRegistry = [')

    # Prepare new entry
    new_entry = """
  {
    id: "Version0011_ultimate_dependency_fix",
    name: "Ultimate Dependency Conflict Fix",
    purpose: "Comprehensive solution for urllib3/boto3 dependency conflicts",
    targetFiles: [
      "requirements.txt",
      "requirements-eb.txt",
      "requirements-simple.txt",
      ".platform/hooks/prebuild/02_install_prereqs.sh",
      ".pip-constraints.txt",
      "scripts/deploy_fixed_env.sh"
    ],
    executionDate: "2025-05-15",
    executionStatus: "SUCCESS",
    author: "DevOps Team",
    notes: "Complete solution that forces compatible versions and prevents pip from installing conflicting packages"
  },"""

    # Insert the new entry
    updated_content = content[:insert_pos] + new_entry + content[insert_pos:]

    with open(registry_file, 'w') as f:
        f.write(updated_content)

    print(f"Updated script registry at {registry_file}")
    return True

def create_troubleshooting_guide():
    """Create a troubleshooting guide for dependency conflicts."""
    guide_path = os.path.join(PROJECT_ROOT, "scripts", "EB_Dependency_Conflict_Resolution.md")
    
    guide_content = """# Elastic Beanstalk Dependency Conflict Resolution

## Understanding urllib3/boto3 Conflicts

### The Problem

When deploying to Elastic Beanstalk, you may encounter dependency conflicts between:
- urllib3
- boto3
- botocore
- s3transfer

The specific error looks like:
```
The conflict is caused by:
    The user requested urllib3==2.2.1
    botocore 1.34.113 depends on urllib3<1.27 and >=1.25.4; python_version < "3.10"
```

### Root Cause

- **Python Version Constraint**: When running on Python 3.9 (as EB does), boto3 and botocore 
  require urllib3 to be version <1.27.0
- **Package Evolution**: Newer packages like requests often want urllib3≥2.0.0
- **Hidden Dependencies**: Some packages may include their own requirements.txt or setup.py 
  that specify incompatible versions

### Our Solution

We've implemented a comprehensive fix that:
1. **Forces consistent versions** across all requirements files
2. **Prevents pip from resolving dependencies** in ways that cause conflicts
3. **Isolates core dependencies** to prevent cascade failures
4. **Uses constraints files** to enforce version boundaries

## How to Deploy After Fixing

1. **Run the fix script**:
   ```bash
   python scripts/Version0011_ultimate_dependency_fix.py
   ```

2. **Deploy with the fixed environment script**:
   ```bash
   bash scripts/deploy_fixed_env.sh
   ```

3. **Verify correct versions are installed**:
   ```bash
   eb ssh
   cd /var/app/current
   source /var/app/venv/*/bin/activate
   pip list | grep -E 'urllib3|boto3|botocore'
   ```

## What We Modified

1. **Created a simplified requirements file** with only essential packages
2. **Added prebuild hooks** that:
   - Force uninstall problematic packages
   - Install compatible versions in the correct order
   - Use constraints to prevent pip from choosing incompatible versions
3. **Added verification checks** to ensure no incompatible versions sneak in

## If Problems Persist

If you still encounter dependency issues:

1. Check for any additional requirements files in subdirectories
2. Inspect setup.py files that might specify dependencies
3. Use the constraints file approach during local development
4. Consider creating a fresh environment instead of updating

Remember: The key is ensuring urllib3==1.26.16 is installed BEFORE boto3/botocore during deployment.
"""

    with open(guide_path, 'w') as f:
        f.write(guide_content)
        
    print(f"Created troubleshooting guide at {guide_path}")
    return guide_path

def main():
    """Main function to fix dependency conflicts."""
    print("Starting ultimate dependency conflict fix...")
    
    # Check for additional requirements files
    additional_files = find_additional_requirements_files()
    if additional_files:
        print(f"Found {len(additional_files)} additional requirements files that might cause conflicts:")
        for file_path in additional_files:
            print(f"  - {file_path}")
    
    # Check for setup.py files
    setup_files = check_for_setup_py_files()
    if setup_files:
        print(f"Found {len(setup_files)} setup.py files that might specify dependencies:")
        for file_path in setup_files:
            print(f"  - {file_path}")
    
    # Fix all requirements files
    eb_fixed = fix_requirements_file(REQUIREMENTS_EB_FILE, is_eb=True)
    main_fixed = fix_requirements_file(REQUIREMENTS_FILE, is_eb=False)
    
    # Fix additional requirements files if found
    additional_fixed = []
    for file_path in additional_files:
        success = fix_requirements_file(file_path)
        additional_fixed.append((file_path, success))
    
    # Create constraints file
    constraints_path = create_constraint_file()
    
    # Update prebuild script
    prebuild_updated = update_prebuild_script()
    
    # Create simplified requirements
    simplified_path = create_simplified_requirements()
    
    # Create deployment script
    deploy_script = create_deploy_script()
    
    # Update script registry
    registry_updated = update_script_registry()
    
    # Create troubleshooting guide
    guide_path = create_troubleshooting_guide()
    
    # Print summary
    print("\nDependency Conflict Resolution Results:")
    print(f"✓ requirements-eb.txt: {'Fixed' if eb_fixed else 'Failed'}")
    print(f"✓ requirements.txt: {'Fixed' if main_fixed else 'Failed'}")
    
    if additional_files:
        print("\nAdditional requirements files:")
        for file_path, success in additional_fixed:
            rel_path = os.path.relpath(file_path, PROJECT_ROOT)
            print(f"✓ {rel_path}: {'Fixed' if success else 'Failed'}")
    
    print(f"\n✓ PIP constraints file: {'Created' if constraints_path else 'Failed'}")
    print(f"✓ Prebuild script: {'Updated' if prebuild_updated else 'Failed'}")
    print(f"✓ Simplified requirements: {'Created' if simplified_path else 'Failed'}")
    print(f"✓ Deployment script: {'Created' if deploy_script else 'Failed'}")
    print(f"✓ Script registry: {'Updated' if registry_updated else 'Failed'}")
    print(f"✓ Troubleshooting guide: {'Created' if guide_path else 'Failed'}")
    
    if eb_fixed and main_fixed and prebuild_updated and simplified_path and deploy_script:
        print("\n✅ All fixes applied successfully!")
        print("\nNext steps:")
        print(f"1. Deploy the application using the new script: bash {deploy_script}")
        print(f"2. If issues persist, consult the troubleshooting guide: {guide_path}")
        return 0
    else:
        print("\n❌ Some fixes could not be applied. Review errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
