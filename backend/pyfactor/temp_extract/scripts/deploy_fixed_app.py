#!/usr/bin/env python3
"""
deploy_fixed_app.py
Script to deploy the Django application to Elastic Beanstalk after applying all
required fixes, including the fix for the extract-msg dependency issue.

Author: DevOps Team
Version: 1.0.0
Date: May 15, 2025
"""

import os
import sys
import subprocess
import datetime
import time

# Directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Parent directory (project root)
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)

# Define colors for terminal output
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
RED = '\033[0;31m'
NC = '\033[0m'  # No Color

def print_message(message):
    """Print a standard message."""
    print(f"{GREEN}[EB Deploy]{NC} {message}")

def print_warning(message):
    """Print a warning message."""
    print(f"{YELLOW}[WARNING]{NC} {message}")

def print_error(message):
    """Print an error message."""
    print(f"{RED}[ERROR]{NC} {message}")

def print_step(message):
    """Print a step message."""
    print(f"{BLUE}[STEP]{NC} {message}")

def run_command(command, allow_fail=True):
    """Run a shell command and return the result."""
    print_message(f"Running: {command}")
    try:
        result = subprocess.run(command, shell=True, text=True, 
                               capture_output=True, check=not allow_fail)
        if result.stdout:
            print(result.stdout)
        if result.stderr and result.returncode != 0:
            print_warning(f"Command stderr: {result.stderr}")
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        if not allow_fail:
            print_error(f"Command failed with exit code {e.returncode}")
            if e.stdout:
                print(e.stdout)
            if e.stderr:
                print_error(e.stderr)
            sys.exit(1)
        return False

def apply_fixes():
    """Apply all the necessary fixes before deployment."""
    fixes_applied = 0
    total_fixes = 5
    
    # Fix 1: Path inconsistency fixes
    print_step(f"Running fix 1/{total_fixes}: Applying path inconsistency fixes...")
    fix_script1 = os.path.join(SCRIPT_DIR, "Version0001_fix_eb_deployment.py")
    if os.path.exists(fix_script1):
        if run_command(f"python {fix_script1}", allow_fail=True):
            fixes_applied += 1
    else:
        print_warning(f"Fix script not found: {fix_script1}")
    
    # Fix 2: Initial dependency conflicts
    print_step(f"Running fix 2/{total_fixes}: Resolving initial dependency conflicts...")
    fix_script2 = os.path.join(SCRIPT_DIR, "Version0002_fix_dependencies_conflict.py")
    if os.path.exists(fix_script2):
        if run_command(f"python {fix_script2}", allow_fail=True):
            fixes_applied += 1
    else:
        print_warning(f"Fix script not found: {fix_script2}")
    
    # Fix 3: Requirements formatting
    print_step(f"Running fix 3/{total_fixes}: Fixing requirements formatting...")
    fix_script3 = os.path.join(SCRIPT_DIR, "Version0003_fix_requirements_format.py")
    if os.path.exists(fix_script3):
        if run_command(f"python {fix_script3}", allow_fail=True):
            fixes_applied += 1
    else:
        print_warning(f"Fix script not found: {fix_script3}")
    
    # Fix 4: Remaining dependency conflicts
    print_step(f"Running fix 4/{total_fixes}: Resolving remaining dependency conflicts...")
    fix_script4 = os.path.join(SCRIPT_DIR, "Version0004_fix_dependencies_conflicts_v2.py")
    if os.path.exists(fix_script4):
        if run_command(f"python {fix_script4}", allow_fail=True):
            fixes_applied += 1
    else:
        print_warning(f"Fix script not found: {fix_script4}")
    
    # Fix 5: Extract-msg dependency fix
    print_step(f"Running fix 5/{total_fixes}: Fixing extract-msg dependency issue...")
    fix_script5 = os.path.join(SCRIPT_DIR, "Version0005_fix_extract_msg.py")
    if os.path.exists(fix_script5):
        if run_command(f"python {fix_script5}", allow_fail=True):
            fixes_applied += 1
    else:
        print_warning(f"Fix script not found: {fix_script5}")
    
    print_message(f"Applied {fixes_applied} out of {total_fixes} fixes successfully.")
    return fixes_applied > 0

def create_new_environment(env_name, python_version, instance_type):
    """Create a new Elastic Beanstalk environment."""
    print_step(f"Creating new environment: {env_name} with Python {python_version} on {instance_type}...")
    
    # Set up command with specific environment variables to avoid timeouts
    command = f"cd {PROJECT_DIR} && eb create {env_name} -p python-{python_version} -i {instance_type}"
    succeed = run_command(command, allow_fail=True)
    
    if not succeed:
        print_warning("Environment creation may have encountered issues.")
        print_warning("You can check the status with: eb status")
        time.sleep(2)  # Give some time for logs to be available
        print_step("Checking logs for any issues...")
        run_command(f"cd {PROJECT_DIR} && eb logs {env_name}", allow_fail=True)
    
    return True

def check_environment_status(env_name):
    """Check the status of the Elastic Beanstalk environment."""
    print_step(f"Checking status of environment: {env_name}...")
    run_command(f"cd {PROJECT_DIR} && eb status {env_name}", allow_fail=True)
    
    # Check health
    print_step(f"Checking health of environment: {env_name}...")
    run_command(f"cd {PROJECT_DIR} && eb health {env_name}", allow_fail=True)
    
    return True

def main():
    """Main function."""
    timestamp = datetime.datetime.now().strftime("%m%d%H%M")
    
    print("\n" + "=" * 80)
    print(f"{BLUE}DJANGO APPLICATION ELASTIC BEANSTALK DEPLOYMENT - FIXED VERSION{NC}")
    print("=" * 80 + "\n")
    
    print_message("Starting fixed deployment process...")
    print_message(f"Current directory: {PROJECT_DIR}")
    
    # Apply fixes
    print_message("Applying all fixes automatically...")
    apply_fixes()
    
    # Confirm with user
    print("\n" + "=" * 50)
    print_message("All fixes have been applied to prepare for deployment.")
    print_message("This will create a new Elastic Beanstalk environment.")
    print("=" * 50 + "\n")
    
    proceed = input("Proceed with environment creation? (y/n) [y]: ").strip().lower() or 'y'
    if proceed != 'y':
        print_message("Deployment cancelled by user.")
        return 0
    
    # Create environment
    env_name = f"pyfactor-env-{timestamp}"
    python_version = "3.9"
    instance_type = "t3.small"
    
    print_message(f"Will create environment: {env_name} with Python {python_version} on {instance_type}")
    
    # Initialize EB if needed
    if not os.path.exists(os.path.join(PROJECT_DIR, ".elasticbeanstalk")):
        print_step("Initializing Elastic Beanstalk application...")
        run_command(f"cd {PROJECT_DIR} && eb init -p python-{python_version}")
    
    # Create new environment
    create_new_environment(env_name, python_version, instance_type)
    
    # Check environment status
    print_message("Waiting 30 seconds before checking environment status...")
    time.sleep(30)
    check_environment_status(env_name)
    
    print("\n" + "=" * 50)
    print_message("Deployment Process Complete!")
    print_message("=" * 50)
    
    print_message("\nNext Steps:")
    print_message("1. Check the status of your environment:")
    print(f"   cd {PROJECT_DIR} && eb status {env_name}")
    
    print_message("\n2. Open the application in a browser:")
    print(f"   cd {PROJECT_DIR} && eb open {env_name}")
    
    print_message("\n3. View the logs:")
    print(f"   cd {PROJECT_DIR} && eb logs {env_name}")
    
    print_message("\nFor more information, refer to:")
    print_message(f"  - Deployment troubleshooting: {os.path.join(SCRIPT_DIR, 'EB_Deployment_Troubleshooting.md')}")
    print_message(f"  - EB deployment fixes: {os.path.join(SCRIPT_DIR, 'EB_Deployment_Fixes.md')}")
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n")
        print_warning("Deployment interrupted by user.")
        sys.exit(1)
