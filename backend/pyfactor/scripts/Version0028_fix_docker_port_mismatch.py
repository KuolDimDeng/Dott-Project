#!/usr/bin/env python3
"""
Version0028_fix_docker_port_mismatch.py

This script creates a fixed Docker deployment package by copying the original package
and replacing the Dockerfile to use port 8080 instead of 8000 to align with Nginx
expectations in Elastic Beanstalk Docker environments.

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
    pattern = "docker-eb-package-fixed-*.zip"
    result = subprocess.run(f"ls -t {BACKEND_DIR}/{pattern} 2>/dev/null | head -1", 
                           shell=True, capture_output=True, text=True)
    if result.stdout.strip():
        return result.stdout.strip()
    
    # If no fixed package exists, look for original
    pattern = "docker-eb-package-*.zip"
    result = subprocess.run(f"ls -t {BACKEND_DIR}/{pattern} 2>/dev/null | head -1", 
                           shell=True, capture_output=True, text=True)
    return result.stdout.strip() if result.stdout.strip() else None

def create_fixed_package():
    """Create a fixed Docker deployment package"""
    # Find the latest package
    original_package = find_latest_docker_package()
    if not original_package:
        print("No Docker deployment package found")
        return False
    
    # Create timestamp for new package
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    new_package = f"{BACKEND_DIR}/docker-eb-package-port-fixed-{timestamp}.zip"
    
    # Create a temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        # Extract the original package
        with zipfile.ZipFile(original_package, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Replace Dockerfile with port 8080 version
        os.remove(os.path.join(temp_dir, 'Dockerfile'))
        shutil.copy(
            os.path.join(BACKEND_DIR, 'Dockerfile'),
            os.path.join(temp_dir, 'Dockerfile')
        )
        
        # Make sure .ebextensions folder has the right files
        if os.path.exists(os.path.join(temp_dir, '.ebextensions', '04_django.config')):
            os.remove(os.path.join(temp_dir, '.ebextensions', '04_django.config'))
            shutil.copy(
                os.path.join(BACKEND_DIR, '.ebextensions', '04_django_docker.config'),
                os.path.join(temp_dir, '.ebextensions', '04_django.config')
            )
        
        if os.path.exists(os.path.join(temp_dir, '.ebextensions', '99_custom_env.config')):
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
// Version0028_fix_docker_port_mismatch.py
// Executed: {timestamp}
// Purpose: Created a fixed Docker deployment package with port 8080 instead of 8000
scripts.push({{
  name: 'Version0028_fix_docker_port_mismatch.py',
  executionDate: '{timestamp}',
  status: 'SUCCESS',
  description: 'Fixed Docker deployment port mismatch by changing the container port from 8000 to 8080'
}});
""")

if __name__ == "__main__":
    print("Starting Docker port mismatch fix...")
    fixed_package = create_fixed_package()
    if fixed_package:
        print("Success!")
        print(f"Upload the fixed package: {os.path.basename(fixed_package)}")
        print("Remember to select 'Docker' platform when creating the environment")
        update_registry()
    else:
        print("Failed to create fixed package")
