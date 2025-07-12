#!/usr/bin/env python3
"""
Version0010_fix_create_new_env.py
Script to create a clean new Elastic Beanstalk environment with the correct settings
to avoid dependency conflicts and ensure proper deployment.

Author: DevOps Team
Version: 1.0.0
Date: May 15, 2025
"""

import os
import sys
import time
import shutil
import datetime
import subprocess
import re

# Configuration
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_NAME = "pyfactor-prod"  # New environment name
PLATFORM = "python-3.9"      # Python platform to use
INSTANCE_TYPE = "t3.small"   # Instance type

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

def ensure_eb_cli():
    """Ensure the Elastic Beanstalk CLI is installed."""
    success, output = execute_command("eb --version")
    if not success:
        print("Elastic Beanstalk CLI not found. Please install it with 'pip install awsebcli'.")
        return False
    
    print(f"Elastic Beanstalk CLI found: {output.strip()}")
    return True

def create_config_file():
    """Create a custom configuration file for the new environment."""
    config_path = os.path.join(PROJECT_ROOT, ".ebextensions/99_custom_env.config")
    
    # Create .ebextensions directory if it doesn't exist
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    
    # Create a backup if the file already exists
    if os.path.exists(config_path):
        create_backup(config_path)
    
    # Custom configuration content
    config_content = """option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /var/app/current
    EB_ENV_NAME: pyfactor-prod
    DEBUG: "False"
    
  aws:elasticbeanstalk:container:python:
    WSGIPath: application.py
    
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: apache
    
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health/
    HealthCheckTimeout: 30
    HealthCheckInterval: 30
    
  aws:autoscaling:launchconfiguration:
    DisableIMDSv1: true
    IamInstanceProfile: aws-elasticbeanstalk-ec2-role
    InstanceType: t3.small
    
  aws:elasticbeanstalk:cloudwatch:logs:
    StreamLogs: true
    DeleteOnTerminate: false
    RetentionInDays: 7

packages:
  yum:
    postgresql-devel: []
    gcc: []
    python3-devel: []

commands:
  01_setup_environment:
    command: |
      echo 'export PYTHONPATH=/var/app/current' >> /etc/environment
      echo 'export DJANGO_SETTINGS_MODULE=pyfactor.settings_eb' >> /etc/environment
"""
    
    # Write the configuration file
    with open(config_path, 'w') as f:
        f.write(config_content)
    
    print(f"Created custom configuration file: {config_path}")
    return True

def create_prebuild_hooks():
    """Create or update the prebuild hooks for the new environment."""
    hooks_dir = os.path.join(PROJECT_ROOT, ".platform", "hooks", "prebuild")
    os.makedirs(hooks_dir, exist_ok=True)
    
    # Create a simplified version of the install script specifically for the new environment
    install_script_path = os.path.join(hooks_dir, "02_install_prereqs.sh")
    
    # Create a backup if the file already exists
    if os.path.exists(install_script_path):
        create_backup(install_script_path)
    
    # Simplified installation script that focuses just on the key dependencies
    install_script_content = """#!/bin/bash
# Prebuild script created by Version0010_fix_create_new_env.py
# This script installs prerequisites before the main deployment process

set -e   # Exit on error
set -x   # Print commands for debugging

echo "==== PREPARING ENVIRONMENT FOR CLEAN DEPLOY ===="

# Install compatible versions of critical packages first
pip install -U pip==23.3.1 setuptools==69.0.3

# Required to prevent dependency conflicts
echo "Installing urllib3 at version 1.26.16 (compatible with boto3/botocore)..."
pip uninstall -y urllib3 || true
pip install urllib3==1.26.16 --no-dependencies

# AWS SDK components at compatible versions
echo "Installing AWS SDK components at compatible versions..."
pip uninstall -y boto3 botocore s3transfer || true
pip install boto3==1.26.164 botocore==1.29.164 s3transfer==0.6.2

# Install critical packages explicitly with their exact versions
echo "Installing critical packages explicitly..."
pip install Django==4.2.10 gunicorn==21.2.0 psycopg2-binary==2.9.9

echo "Prebuild prerequisites installed successfully"
"""
    
    # Write the installation script
    with open(install_script_path, 'w') as f:
        f.write(install_script_content)
    
    # Make the script executable
    os.chmod(install_script_path, 0o755)
    
    print(f"Created prebuild hook: {install_script_path}")
    return True

def update_requirements():
    """Create a simplified requirements file for clean deployment."""
    simplified_req_path = os.path.join(PROJECT_ROOT, "requirements-simple.txt")
    
    # Create contained requirements with just the critical packages
    simplified_requirements = """# Simplified requirements for clean EB deployment
# Generated by Version0010_fix_create_new_env.py

# Core web framework
Django==4.2.10

# WSGI server
gunicorn==21.2.0

# Database adapter
psycopg2-binary==2.9.9

# AWS SDK (specific versions to avoid urllib3 conflicts)
urllib3==1.26.16
boto3==1.26.164
botocore==1.29.164
s3transfer==0.6.2

# Critical dependencies
djangorestframework==3.14.0
django-cors-headers==4.3.1
python-dotenv==1.0.1
celery==5.4.0
redis==5.0.7
"""
    
    # Write the simplified requirements
    with open(simplified_req_path, 'w') as f:
        f.write(simplified_requirements)
    
    print(f"Created simplified requirements file: {simplified_req_path}")
    return simplified_req_path

def create_deploy_script():
    """Create a deployment script for the new environment."""
    deploy_script_path = os.path.join(PROJECT_ROOT, "scripts", "deploy_new_env.sh")
    
    # Create a backup if the file already exists
    if os.path.exists(deploy_script_path):
        create_backup(deploy_script_path)
    
    # Deployment script content
    deploy_script_content = """#!/bin/bash
# deploy_new_env.sh
# Created by Version0010_fix_create_new_env.py
# Script to deploy to a new clean Elastic Beanstalk environment

set -e  # Exit on error

# Environment name and settings
ENV_NAME="pyfactor-prod"
PLATFORM="python-3.9"
INSTANCE_TYPE="t3.small"

echo "====================================================="
echo "   CREATING NEW ELASTIC BEANSTALK ENVIRONMENT"
echo "====================================================="
echo "Environment: $ENV_NAME"
echo "Platform: $PLATFORM"
echo "Instance Type: $INSTANCE_TYPE"
echo "====================================================="

# Use simplified requirements for initial deployment
if [ -f "requirements-simple.txt" ]; then
    echo "Using simplified requirements file for clean deployment"
    cp requirements-simple.txt requirements.txt.original
    cp requirements-simple.txt requirements.txt
fi

# Create new environment
echo "Creating new environment..."
eb create $ENV_NAME \\
    --platform "$PLATFORM" \\
    --instance-type "$INSTANCE_TYPE" \\
    --single \\
    --timeout 20 \\
    --verbose

# Restore original requirements if backed up
if [ -f "requirements.txt.original" ]; then
    echo "Restoring original requirements file"
    mv requirements.txt.original requirements.txt
fi

echo "====================================================="
echo "   DEPLOYMENT COMPLETE"
echo "====================================================="
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
    if "Version0010_fix_create_new_env" in content:
        print("Script already exists in registry. Skipping update.")
        return True

    # Find the position to insert the new entry
    insert_pos = content.find('const scriptRegistry = [') + len('const scriptRegistry = [')

    # Prepare new entry
    new_entry = """
  {
    id: "Version0010_fix_create_new_env",
    name: "Create New EB Environment",
    purpose: "Creates configuration for a clean new Elastic Beanstalk environment",
    targetFiles: [
      ".ebextensions/99_custom_env.config",
      ".platform/hooks/prebuild/02_install_prereqs.sh",
      "requirements-simple.txt",
      "scripts/deploy_new_env.sh"
    ],
    executionDate: "2025-05-15",
    executionStatus: "SUCCESS",
    author: "DevOps Team",
    notes: "Sets up configurations and scripts for creating a clean new Elastic Beanstalk environment to avoid dependency conflicts"
  },"""

    # Insert the new entry
    updated_content = content[:insert_pos] + new_entry + content[insert_pos:]

    with open(registry_file, 'w') as f:
        f.write(updated_content)

    print(f"Updated script registry at {registry_file}")
    return True

def main():
    """Main function to create a new Elastic Beanstalk environment."""
    print("Starting Elastic Beanstalk environment creation preparation...")
    
    # Check if EB CLI is installed
    if not ensure_eb_cli():
        print("Please install the EB CLI first and try again.")
        return 1
    
    # Create configuration files and scripts
    config_created = create_config_file()
    hooks_created = create_prebuild_hooks()
    req_path = update_requirements()
    deploy_script = create_deploy_script()
    registry_updated = update_script_registry()
    
    # Print summary
    print("\nElastic Beanstalk Environment Creation Preparation Results:")
    print(f"✓ Custom configuration file: {'Created' if config_created else 'Failed'}")
    print(f"✓ Prebuild hooks: {'Created' if hooks_created else 'Failed'}")
    print(f"✓ Simplified requirements: {'Created' if req_path else 'Failed'}")
    print(f"✓ Deployment script: {'Created' if deploy_script else 'Failed'}")
    print(f"✓ Script registry: {'Updated' if registry_updated else 'Failed'}")
    
    if config_created and hooks_created and req_path and deploy_script:
        print("\nPreparation completed successfully!")
        print("Next steps:")
        print(f"1. Review the created files and make any necessary adjustments")
        print(f"2. Run the deployment script: bash {deploy_script}")
        print(f"3. After deployment, navigate to the EB environment URL to verify the application")
        return 0
    else:
        print("\nSome preparation steps failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
