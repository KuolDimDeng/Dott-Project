#!/usr/bin/env python3
"""
Version0027_fix_docker_deployment.py

This script creates a fixed Docker deployment package by copying the original package
and replacing the problematic .ebextensions configuration files with Docker-compatible versions.
The script removes the aws:elasticbeanstalk:environment:proxy:staticfiles namespace 
which is not supported in Docker platform deployments.

Created: May 17, 2025
Author: System Administrator
"""

import os
import shutil
import zipfile
import tempfile
import subprocess
from datetime import datetime

# Global variables
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_DIR = os.path.dirname(os.path.dirname(BACKEND_DIR))

def find_latest_docker_package():
    """Find the latest docker deployment package"""
    pattern = "docker-eb-package-*.zip"
    result = subprocess.run(f"ls -t {BACKEND_DIR}/{pattern} 2>/dev/null | head -1", 
                           shell=True, capture_output=True, text=True)
    if result.stdout.strip():
        return result.stdout.strip()
    return None

def create_fixed_package():
    """Create a fixed Docker deployment package"""
    # Find the latest package
    original_package = find_latest_docker_package()
    if not original_package:
        print("No Docker deployment package found")
        return False
    
    # Create timestamp for new package
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    new_package = f"{BACKEND_DIR}/docker-eb-package-fixed-{timestamp}.zip"
    
    # Create a temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        # Extract the original package
        with zipfile.ZipFile(original_package, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Fix 1: Replace static files configuration
        os.remove(os.path.join(temp_dir, '.ebextensions', '04_django.config'))
        shutil.copy(
            os.path.join(BACKEND_DIR, '.ebextensions', '04_django_docker.config'),
            os.path.join(temp_dir, '.ebextensions', '04_django.config')
        )
        
        # Fix 2: Replace proxy server configuration
        os.remove(os.path.join(temp_dir, '.ebextensions', '99_custom_env.config'))
        shutil.copy(
            os.path.join(BACKEND_DIR, '.ebextensions', '99_custom_env_docker.config'),
            os.path.join(temp_dir, '.ebextensions', '99_custom_env.config')
        )
        
        # Create new zip package
        with zipfile.ZipFile(new_package, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arcname)
    
    print(f"Fixed deployment package created: {new_package}")
    return new_package

def update_registry():
    """Update script registry with this script's execution"""
    registry_path = os.path.join(SCRIPT_DIR, 'script_registry.js')
    if os.path.exists(registry_path):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(registry_path, 'a') as f:
            f.write(f"""
// Version0027_fix_docker_deployment.py
// Executed: {timestamp}
// Purpose: Created a fixed Docker deployment package with Docker-compatible .ebextensions
scripts.push({{
  name: 'Version0027_fix_docker_deployment.py',
  executionDate: '{timestamp}',
  status: 'SUCCESS',
  description: 'Fixed Docker deployment package by removing unsupported static files configuration'
}});
""")

if __name__ == "__main__":
    print("Starting Docker deployment package fix...")
    fixed_package = create_fixed_package()
    if fixed_package:
        print("Success!")
        print(f"Upload the fixed package: {os.path.basename(fixed_package)}")
        print("Remember to select 'Docker' platform when creating the environment")
        update_registry()
    else:
        print("Failed to create fixed package")
