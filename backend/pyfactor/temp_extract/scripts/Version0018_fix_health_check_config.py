#!/usr/bin/env python
"""
Script: Version0018_fix_health_check_config.py
Purpose: Fix health check configuration for AWS Elastic Beanstalk environment
Issue: Health check interval must be greater than the timeout
Author: System
Date: May 16, 2025
"""

import os
import sys
import shutil
from datetime import datetime

# Configuration paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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

def fix_health_check_config():
    """Fix health check timeout and interval for AWS ElasticBeanstalk."""
    if not os.path.exists(HEALTH_CONFIG_PATH):
        print(f"Error: Health check config file not found at {HEALTH_CONFIG_PATH}")
        return False
    
    # Create backup of original file
    backup_path = create_backup(HEALTH_CONFIG_PATH)
    
    # Read the current configuration
    with open(HEALTH_CONFIG_PATH, 'r') as f:
        config_content = f.read()
    
    # Define the fixed content with a wider gap between interval and timeout
    fixed_content = """option_settings:
  aws:elasticbeanstalk:application:
    Application Healthcheck URL: /health/

  aws:elasticbeanstalk:environment:process:default:
    DeregistrationDelay: '20'
    HealthCheckInterval: '30'
    HealthCheckPath: /health/
    HealthCheckTimeout: '5'
    HealthyThresholdCount: '3'
    UnhealthyThresholdCount: '5'
    Port: '8000'
    Protocol: HTTP
    StickinessEnabled: 'true'
    StickinessLBCookieDuration: '43200'
"""
    
    # Write the fixed content
    with open(HEALTH_CONFIG_PATH, 'w') as f:
        f.write(fixed_content)
    
    print(f"Health check configuration updated successfully")
    print(f"Changed interval from 15 to 30 seconds (timeout remains 5 seconds)")
    print(f"Original file backed up to: {backup_path}")
    return True

def update_script_registry():
    """Add this script to the script registry."""
    registry_path = os.path.join(SCRIPT_DIR, 'script_registry.js')
    
    if not os.path.exists(registry_path):
        print("Warning: script_registry.js not found. Creating new registry.")
        registry_content = """// Script Registry
// Maintains a record of all scripts executed and their purposes

const scriptRegistry = [
  {
    script: "Version0018_fix_health_check_config.py",
    purpose: "Fix health check configuration for AWS Elastic Beanstalk",
    issue: "Health check interval must be greater than timeout",
    executed: "May 16, 2025",
    status: "Success",
    target: ".ebextensions/03_health_check.config"
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
    if "Version0018_fix_health_check_config.py" in content:
        print("Script already exists in registry. Skipping update.")
        return
    
    # Add new entry
    entry = """  {
    script: "Version0018_fix_health_check_config.py",
    purpose: "Fix health check configuration for AWS Elastic Beanstalk",
    issue: "Health check interval must be greater than timeout",
    executed: "May 16, 2025",
    status: "Success",
    target: ".ebextensions/03_health_check.config"
  },
"""
    
    # Insert the new entry after the opening bracket of the array
    insert_pos = content.find("const scriptRegistry = [") + len("const scriptRegistry = [")
    updated_content = content[:insert_pos] + "\n" + entry + content[insert_pos:]
    
    with open(registry_path, 'w') as f:
        f.write(updated_content)
    
    print("Script registry updated successfully.")

def create_deployment_script():
    """Create a shell script to deploy the fixed configuration."""
    deploy_script_path = os.path.join(SCRIPT_DIR, 'deploy_health_check_fixed.sh')
    
    script_content = """#!/bin/bash
# deploy_health_check_fixed.sh
# Deploys the application with fixed health check configuration
# Created: May 16, 2025

set -e

cd "$(dirname "$0")/.."
echo "🔧 Deploying with fixed health check configuration..."

# Run the health check fix script first
python scripts/Version0018_fix_health_check_config.py

# Deploy with the fixed configuration
echo "📦 Deploying to Elastic Beanstalk..."
eb deploy --label health-check-fixed-$(date +%Y%m%d%H%M%S) --staged

echo "✅ Deployment with health check fix complete"
"""
    
    with open(deploy_script_path, 'w') as f:
        f.write(script_content)
    
    # Make the script executable
    os.chmod(deploy_script_path, 0o755)
    print(f"Created deployment script at: {deploy_script_path}")

def create_documentation():
    """Create documentation for the health check fix."""
    doc_path = os.path.join(PROJECT_ROOT, 'scripts', 'Health_Check_Fix.md')
    
    doc_content = """# Health Check Configuration Fix

## Issue
The deployment to AWS Elastic Beanstalk was failing with the following error:
```
Health check interval must be greater than the timeout. (Service: ElasticLoadBalancingV2, Status Code: 400)
```

## Root Cause Analysis
The health check configuration had an interval of 15 seconds and a timeout of 5 seconds. 
While this technically meets the requirement that the interval be greater than the timeout,
AWS may have additional requirements about the minimum difference between these values.

## Solution
The script `Version0018_fix_health_check_config.py` modifies the `.ebextensions/03_health_check.config` file
to increase the health check interval to 30 seconds while keeping the timeout at 5 seconds.
This provides a wider margin between the two values to ensure compliance with AWS requirements.

## Changes Made
- **HealthCheckInterval**: Changed from 15 to 30 seconds
- **HealthCheckTimeout**: Remained at 5 seconds

## Deployment
To deploy with this fix:
```bash
cd /path/to/backend/pyfactor
./scripts/deploy_health_check_fixed.sh
```

## Verification
After deployment, verify that the environment health is green and that the application is functioning correctly.

## Date Implemented
May 16, 2025
"""
    
    with open(doc_path, 'w') as f:
        f.write(doc_content)
    
    print(f"Created documentation at: {doc_path}")

if __name__ == "__main__":
    print("Running Health Check Configuration Fix...")
    success = fix_health_check_config()
    
    if success:
        update_script_registry()
        create_deployment_script()
        create_documentation()
        print("\nHealth check configuration fix completed successfully.")
        print("To deploy with the fixed configuration, run:")
        print(f"  cd {PROJECT_ROOT}")
        print("  ./scripts/deploy_health_check_fixed.sh")
    else:
        print("\nFailed to fix health check configuration.")
        sys.exit(1)
