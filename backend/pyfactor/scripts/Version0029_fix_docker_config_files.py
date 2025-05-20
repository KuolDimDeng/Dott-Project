#!/usr/bin/env python3
"""
Version0029_fix_docker_config_files.py

This script fixes configuration errors in the Docker deployment package related to
invalid parameters like WSGIPath, NumProcesses, and NumThreads that are not supported
in Docker platform environments.

Created: May 17, 2025
Author: System Administrator
"""

import os
import shutil
import zipfile
import tempfile
import json
import yaml
import subprocess
from datetime import datetime

# Global variables
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_DIR = os.path.dirname(os.path.dirname(BACKEND_DIR))

def find_latest_docker_package():
    """Find the latest docker deployment package"""
    pattern = "docker-eb-package-port-fixed-*.zip"
    result = subprocess.run(f"ls -t {BACKEND_DIR}/{pattern} 2>/dev/null | head -1", 
                            shell=True, capture_output=True, text=True)
    if result.stdout.strip():
        return result.stdout.strip()
    
    # If no fixed package exists, look for original fixed ones
    pattern = "docker-eb-package-fixed-*.zip"
    result = subprocess.run(f"ls -t {BACKEND_DIR}/{pattern} 2>/dev/null | head -1", 
                           shell=True, capture_output=True, text=True)
    
    if result.stdout.strip():
        return result.stdout.strip()
        
    # If still no package found, try original
    pattern = "docker-eb-package-*.zip"
    result = subprocess.run(f"ls -t {BACKEND_DIR}/{pattern} 2>/dev/null | head -1", 
                           shell=True, capture_output=True, text=True)
    return result.stdout.strip() if result.stdout.strip() else None

def fix_option_settings(config_data):
    """Remove unsupported options from config files"""
    if 'option_settings' not in config_data:
        return config_data
        
    # Parameters to remove - these are not supported in Docker platform
    unsupported_params = ['WSGIPath', 'NumProcesses', 'NumThreads']
    
    # Filter out options that contain unsupported parameters
    filtered_options = {}
    for namespace, options in config_data['option_settings'].items():
        filtered_namespace_options = {}
        for option_name, value in options.items():
            if option_name not in unsupported_params:
                filtered_namespace_options[option_name] = value
        
        if filtered_namespace_options:  # Only keep namespace if it has options left
            filtered_options[namespace] = filtered_namespace_options
    
    # Replace with filtered options
    config_data['option_settings'] = filtered_options
    return config_data

def create_fixed_package():
    """Create a fixed Docker deployment package"""
    # Find the latest package
    original_package = find_latest_docker_package()
    if not original_package:
        print("No Docker deployment package found")
        return False
    
    # Create timestamp for new package
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    new_package = f"{BACKEND_DIR}/docker-eb-package-config-fixed-{timestamp}.zip"
    
    # Create a temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        # Extract the original package
        with zipfile.ZipFile(original_package, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Check for .ebextensions directory
        eb_extensions_dir = os.path.join(temp_dir, '.ebextensions')
        if os.path.exists(eb_extensions_dir):
            print("Found .ebextensions directory, fixing config files...")
            
            # Process each .config file
            for filename in os.listdir(eb_extensions_dir):
                if filename.endswith('.config'):
                    config_path = os.path.join(eb_extensions_dir, filename)
                    print(f"Processing {filename}...")
                    
                    try:
                        # Read config file
                        with open(config_path, 'r') as f:
                            config_data = yaml.safe_load(f)
                        
                        if config_data:
                            # Fix option_settings
                            fixed_config = fix_option_settings(config_data)
                            
                            # Write fixed config back
                            with open(config_path, 'w') as f:
                                yaml.dump(fixed_config, f, default_flow_style=False)
                            print(f"  Fixed {filename}")
                    except Exception as e:
                        print(f"  Error processing {filename}: {str(e)}")
        
        # Check for Dockerrun.aws.json
        dockerrun_path = os.path.join(temp_dir, 'Dockerrun.aws.json')
        if os.path.exists(dockerrun_path):
            print("Found Dockerrun.aws.json, ensuring it's correctly configured...")
            try:
                # Make sure it's valid and minimize issues
                with open(dockerrun_path, 'r') as f:
                    dockerrun_data = json.load(f)
                
                # Ensure the AWSEBDockerrunVersion is set to the latest version
                dockerrun_data['AWSEBDockerrunVersion'] = '3'
                
                # Write back
                with open(dockerrun_path, 'w') as f:
                    json.dump(dockerrun_data, f, indent=2)
                print("  Fixed Dockerrun.aws.json")
            except Exception as e:
                print(f"  Error processing Dockerrun.aws.json: {str(e)}")
        
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
// Version0029_fix_docker_config_files.py
// Executed: {timestamp}
// Purpose: Fixed Docker deployment package configuration errors
scripts.push({{
  name: 'Version0029_fix_docker_config_files.py',
  executionDate: '{timestamp}',
  status: 'SUCCESS',
  description: 'Removed unsupported parameters (WSGIPath, NumProcesses, NumThreads) from .ebextensions config files'
}});
""")

if __name__ == "__main__":
    print("Starting Docker configuration fixes...")
    fixed_package = create_fixed_package()
    if fixed_package:
        print("Success!")
        print(f"Upload the fixed package: {os.path.basename(fixed_package)}")
        print("Remember to select 'Docker' platform when creating the environment")
        update_registry()
    else:
        print("Failed to create fixed package")
