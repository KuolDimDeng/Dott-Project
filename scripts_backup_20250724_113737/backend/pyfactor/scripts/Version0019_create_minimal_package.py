#!/usr/bin/env python
"""
Script: Version0019_create_minimal_package.py
Purpose: Create a minimal AWS Elastic Beanstalk deployment package with health check fix
Issue: The existing package files are too large for AWS console upload (>500MB limit)
Author: System
Date: May 16, 2025
"""

import os
import sys
import shutil
import tempfile
import zipfile
import subprocess
from datetime import datetime

# Configuration paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OPTIMIZED_PACKAGE_PATH = os.path.join(PROJECT_ROOT, 'optimized-clean-package.zip')
HEALTH_CONFIG_PATH = os.path.join(PROJECT_ROOT, '.ebextensions/03_health_check.config')
BACKUP_DIR = os.path.join(PROJECT_ROOT, 'backups')

def create_backup(file_path):
    """Create a backup of the file with timestamp."""
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = os.path.basename(file_path)
    backup_path = os.path.join(BACKUP_DIR, f"{filename}.backup_{timestamp}")
    
    shutil.copy2(file_path, backup_path)
    print(f"Created backup at: {backup_path}")
    return backup_path

def check_health_check_fix():
    """Check if health check configuration has been fixed."""
    if not os.path.exists(HEALTH_CONFIG_PATH):
        print(f"Error: Health check config file not found at {HEALTH_CONFIG_PATH}")
        return False
    
    # Read the current configuration
    with open(HEALTH_CONFIG_PATH, 'r') as f:
        config_content = f.read()
    
    # Check if the interval has been updated to 30 seconds
    if "HealthCheckInterval: '30'" in config_content:
        print("Health check fix is already applied (interval is set to 30 seconds).")
        return True
    else:
        print("Health check fix has NOT been applied. Running the fix now...")
        # Run the health check fix script
        fix_script = os.path.join(SCRIPT_DIR, 'Version0018_fix_health_check_config.py')
        if os.path.exists(fix_script):
            subprocess.run([sys.executable, fix_script], check=True)
            return True
        else:
            print(f"Error: Health check fix script not found at {fix_script}")
            return False

def create_minimal_package():
    """Create a minimal EB deployment package from the optimized-clean-package.zip."""
    if not os.path.exists(OPTIMIZED_PACKAGE_PATH):
        print(f"Error: Optimized package not found at {OPTIMIZED_PACKAGE_PATH}")
        return False
    
    # Create a new output filename with current timestamp
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    output_zip_path = os.path.join(PROJECT_ROOT, f"minimal-fixed-package-{timestamp}.zip")
    
    # Create a temporary directory to extract and modify the optimized package
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"Extracting optimized package to temporary directory...")
        
        # Extract the optimized package
        with zipfile.ZipFile(OPTIMIZED_PACKAGE_PATH, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Ensure .ebextensions directory exists
        ebext_dir = os.path.join(temp_dir, '.ebextensions')
        os.makedirs(ebext_dir, exist_ok=True)
        
        # Copy the fixed health check configuration
        src_health_config = os.path.join(PROJECT_ROOT, '.ebextensions/03_health_check.config')
        dst_health_config = os.path.join(ebext_dir, '03_health_check.config')
        shutil.copy2(src_health_config, dst_health_config)
        
        # Copy other critical .ebextensions files
        for config_file in ['01_python.config', '02_packages.config', '04_django.config', '05_database.config']:
            src_config = os.path.join(PROJECT_ROOT, '.ebextensions', config_file)
            dst_config = os.path.join(ebext_dir, config_file)
            if os.path.exists(src_config):
                shutil.copy2(src_config, dst_config)
        
        # Ensure .platform directory and hooks are included
        platform_dir = os.path.join(temp_dir, '.platform')
        hooks_dir = os.path.join(platform_dir, 'hooks')
        os.makedirs(os.path.join(hooks_dir, 'prebuild'), exist_ok=True)
        os.makedirs(os.path.join(hooks_dir, 'predeploy'), exist_ok=True)
        os.makedirs(os.path.join(hooks_dir, 'postdeploy'), exist_ok=True)
        
        # Copy hook scripts
        src_hooks_path = os.path.join(PROJECT_ROOT, '.platform', 'hooks')
        if os.path.exists(src_hooks_path):
            for hook_type in ['prebuild', 'predeploy', 'postdeploy']:
                src_hook_dir = os.path.join(src_hooks_path, hook_type)
                dst_hook_dir = os.path.join(hooks_dir, hook_type)
                
                if os.path.exists(src_hook_dir):
                    for script in os.listdir(src_hook_dir):
                        if script.endswith('.sh') and not script.endswith('.backup-'):
                            src_script = os.path.join(src_hook_dir, script)
                            dst_script = os.path.join(dst_hook_dir, script)
                            shutil.copy2(src_script, dst_script)
                            # Make sure it's executable
                            os.chmod(dst_script, 0o755)
        
        # Create the new zip file
        print(f"Creating minimal package with fixed health check configuration...")
        with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, temp_dir)
                    zipf.write(full_path, rel_path)
    
    print(f"\nMinimal package created successfully at: {output_zip_path}")
    print(f"Package size: {os.path.getsize(output_zip_path) / 1024 / 1024:.2f} MB")
    return output_zip_path

def update_script_registry():
    """Add this script to the script registry."""
    registry_path = os.path.join(SCRIPT_DIR, 'script_registry.js')
    
    if not os.path.exists(registry_path):
        print("Warning: script_registry.js not found. Creating new registry.")
        registry_content = """// Script Registry
// Maintains a record of all scripts executed and their purposes

const scriptRegistry = [
  {
    script: "Version0019_create_minimal_package.py",
    purpose: "Create minimal AWS Elastic Beanstalk deployment package",
    issue: "Existing package files too large for AWS console upload (>500MB limit)",
    executed: "May 16, 2025",
    status: "Success",
    target: "minimal-fixed-package.zip"
  }
];

module.exports = scriptRegistry;
"""
        with open(registry_path, 'w') as f:
            f.write(registry_content)
        print("Created new script registry with this script entry.")
        return
    
    # Read existing registry
    with open(registry_path, 'r') as f:
        content = f.read()
    
    # Check if script is already in registry
    if "Version0019_create_minimal_package.py" in content:
        print("Script already exists in registry. Skipping update.")
        return
    
    # Add new entry
    entry = """  {
    script: "Version0019_create_minimal_package.py",
    purpose: "Create minimal AWS Elastic Beanstalk deployment package",
    issue: "Existing package files too large for AWS console upload (>500MB limit)",
    executed: "May 16, 2025",
    status: "Success",
    target: "minimal-fixed-package.zip"
  },
"""
    
    # Insert the new entry after the opening bracket of the array
    insert_pos = content.find("const scriptRegistry = [") + len("const scriptRegistry = [")
    updated_content = content[:insert_pos] + "\n" + entry + content[insert_pos:]
    
    with open(registry_path, 'w') as f:
        f.write(updated_content)
    
    print("Script registry updated successfully.")

def create_documentation():
    """Create documentation for the package size fix."""
    doc_path = os.path.join(PROJECT_ROOT, 'scripts', 'Minimal_Package_Fix.md')
    
    doc_content = """# Minimal Package Size Fix for AWS Elastic Beanstalk

## Issue
The deployment to AWS Elastic Beanstalk via the AWS Console was failing with the following error:
```
Source bundle is empty or exceeds maximum allowed size: 524288000
```

The AWS Console has a 500MB upload limit for application versions, but our current health-check-fixed-package.zip (749MB) and postgresql-fixed-package.zip (246MB) exceed this limit.

## Root Cause Analysis
The deployment packages contained unnecessary large files, dependencies, and possibly cached files that were inflating the package size. We needed a minimal package that still contained all the necessary configuration files (.ebextensions and .platform hooks) with the health check fix.

## Solution
The script `Version0019_create_minimal_package.py` creates a smaller deployment package by:

1. Starting with our smallest optimized package (optimized-clean-package.zip at ~500KB)
2. Adding the critical configuration files:
   - The updated health check configuration (.ebextensions/03_health_check.config)
   - Other necessary .ebextensions files
   - Platform hook scripts (.platform/hooks/*)
3. Creating a new ZIP file with just these essential components

## Deployment
To deploy using this minimal package:

1. Run the script to generate the minimal package:
```bash
cd /path/to/backend/pyfactor
python scripts/Version0019_create_minimal_package.py
```

2. Once the minimal package is created, upload it to the AWS Elastic Beanstalk Console:
   - Log in to the AWS Console
   - Navigate to Elastic Beanstalk
   - Select your environment
   - Click "Upload and deploy"
   - Upload the minimal-fixed-package-[timestamp].zip file
   - Add a version label (e.g., "minimal-fixed-20250516")
   - Click "Deploy"

## Verification
After deployment, verify that:
- The environment health is green
- The application is functioning correctly
- The health check configuration has been fixed (interval = 30 seconds, timeout = 5 seconds)

## Date Implemented
May 16, 2025
"""
    
    with open(doc_path, 'w') as f:
        f.write(doc_content)
    
    print(f"Created documentation at: {doc_path}")

if __name__ == "__main__":
    print("Creating Minimal AWS Elastic Beanstalk Package...")
    
    # Check and ensure health check fix is applied
    if check_health_check_fix():
        # Create the minimal package
        output_path = create_minimal_package()
        
        if output_path:
            update_script_registry()
            create_documentation()
            print("\nMinimal package creation completed successfully.")
            print("To deploy with the minimal package, run:")
            print(f"  Upload {os.path.basename(output_path)} to the AWS Elastic Beanstalk Console.")
            print("  (Size should be well under the 500MB AWS Console upload limit)")
        else:
            print("\nFailed to create minimal package.")
            sys.exit(1)
    else:
        print("\nFailed to apply health check fix.")
        sys.exit(1)
