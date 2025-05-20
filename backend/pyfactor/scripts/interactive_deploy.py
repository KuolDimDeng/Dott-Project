#!/usr/bin/env python3
"""
interactive_deploy.py
Script to interactively deploy the Django application to Elastic Beanstalk
after applying all the necessary fixes.
Author: DevOps Team
Version: 1.0.0
Date: May 15, 2025
"""

import os
import sys
import subprocess
import time
import datetime

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

def run_command(command, allow_fail=False):
    """Run a shell command and return the result."""
    print_message(f"Running: {command}")
    try:
        result = subprocess.run(command, shell=True, text=True, 
                               capture_output=True, check=not allow_fail)
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print_warning(f"Command stderr: {result.stderr}")
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print_error(f"Command failed with exit code {e.returncode}")
        if e.stdout:
            print(e.stdout)
        if e.stderr:
            print_error(e.stderr)
        if not allow_fail:
            sys.exit(1)
        return False

def apply_fixes():
    """Apply all the necessary fixes before deployment."""
    print_step("Running step 1/4: Applying path inconsistency fixes...")
    fix_script1 = os.path.join(SCRIPT_DIR, "Version0001_fix_eb_deployment.py")
    if not os.path.exists(fix_script1):
        print_error(f"Fix script not found: {fix_script1}")
        sys.exit(1)
    run_command(f"python {fix_script1}")
    
    print_step("Running step 2/4: Resolving initial dependency conflicts...")
    fix_script2 = os.path.join(SCRIPT_DIR, "Version0002_fix_dependencies_conflict.py")
    if not os.path.exists(fix_script2):
        print_error(f"Fix script not found: {fix_script2}")
        sys.exit(1)
    run_command(f"python {fix_script2}")
    
    print_step("Running step 3/4: Fixing requirements formatting...")
    fix_script3 = os.path.join(SCRIPT_DIR, "Version0003_fix_requirements_format.py")
    if not os.path.exists(fix_script3):
        print_error(f"Fix script not found: {fix_script3}")
        sys.exit(1)
    run_command(f"python {fix_script3}")
    
    print_step("Running step 4/4: Resolving remaining dependency conflicts...")
    fix_script4 = os.path.join(SCRIPT_DIR, "Version0004_fix_dependencies_conflicts_v2.py")
    if not os.path.exists(fix_script4):
        print_error(f"Fix script not found: {fix_script4}")
        sys.exit(1)
    run_command(f"python {fix_script4}")
    
    print_message("All fixes applied successfully!")
    
def check_environment():
    """Check if the system has the necessary tools installed."""
    tools = ["eb", "python"]
    missing_tools = []
    
    for tool in tools:
        try:
            subprocess.run(["which", tool], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError:
            missing_tools.append(tool)
    
    if missing_tools:
        print_error(f"The following required tools are missing: {', '.join(missing_tools)}")
        print_warning("Please install them before proceeding:")
        if "eb" in missing_tools:
            print("  - Install AWS EB CLI with: pip install awsebcli")
        if "python" in missing_tools:
            print("  - Install Python from: https://www.python.org/downloads/")
        sys.exit(1)
    
    print_message("All required tools are installed.")

def initialize_eb():
    """Initialize Elastic Beanstalk if needed."""
    if not os.path.exists(os.path.join(PROJECT_DIR, ".elasticbeanstalk")):
        print_step("Initializing Elastic Beanstalk application...")
        succeed = run_command("cd {} && eb init".format(PROJECT_DIR), allow_fail=True)
        if not succeed:
            print_error("Failed to initialize Elastic Beanstalk application.")
            print_warning("Please initialize manually with: eb init")
            sys.exit(1)
    else:
        print_message("Elastic Beanstalk already initialized.")

def create_new_environment(env_name, python_version, instance_type):
    """Create a new Elastic Beanstalk environment."""
    print_step(f"Creating new environment: {env_name} with Python {python_version} on {instance_type}...")
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    deploy_log = os.path.join(SCRIPT_DIR, f"deploy_log_{timestamp}.txt")
    
    command = f"cd {PROJECT_DIR} && eb create {env_name} -p python-{python_version} -i {instance_type}"
    succeed = run_command(command, allow_fail=True)
    if not succeed:
        print_error("Failed to create new environment.")
        print_warning("Check the AWS console for more information.")
        print_warning("You can also try to create the environment manually with:")
        print(f"  cd {PROJECT_DIR} && eb create {env_name} -p python-{python_version} -i {instance_type}")
        return False
    return True

def deploy_to_existing_environment():
    """Deploy to an existing Elastic Beanstalk environment."""
    print_step("Deploying to existing environment...")
    succeed = run_command(f"cd {PROJECT_DIR} && eb deploy", allow_fail=True)
    if not succeed:
        print_error("Deployment failed.")
        print_warning("Check the AWS console for more information.")
        print_warning("You can also try to deploy manually with:")
        print(f"  cd {PROJECT_DIR} && eb deploy")
        return False
    return True

def check_health(env_name=None):
    """Check the health of the Elastic Beanstalk environment."""
    command = f"cd {PROJECT_DIR} && eb health"
    if env_name:
        command += f" {env_name}"
    run_command(command, allow_fail=True)

def view_logs(env_name=None):
    """View the logs of the Elastic Beanstalk environment."""
    command = f"cd {PROJECT_DIR} && eb logs"
    if env_name:
        command += f" {env_name}"
    run_command(command, allow_fail=True)

def main():
    """Main function."""
    os.system('clear' if os.name == 'posix' else 'cls')
    print("\n" + "=" * 80)
    print(f"{BLUE}DJANGO APPLICATION ELASTIC BEANSTALK DEPLOYMENT{NC}")
    print("=" * 80 + "\n")
    
    print_message("Starting interactive deployment process...")
    print_message(f"Current directory: {PROJECT_DIR}")
    
    # Check for necessary tools
    check_environment()
    
    # Navigate to project directory
    os.chdir(PROJECT_DIR)
    
    # Ask if user wants to apply fixes
    apply_fixes_input = input(f"{YELLOW}Apply all deployment fixes before deploying? (y/n) [y]:{NC} ").strip().lower()
    if apply_fixes_input == "" or apply_fixes_input.startswith('y'):
        apply_fixes()
    else:
        print_warning("Skipping fix application as requested.")
    
    # Initialize EB if needed
    initialize_eb()
    
    # Ask if user wants to create a new environment
    create_new = input(f"{YELLOW}Create a new environment? (y/n) [y]:{NC} ").strip().lower()
    success = False
    env_name = None
    
    if create_new == "" or create_new.startswith('y'):
        # Ask for environment name
        env_name = input(f"{YELLOW}Enter environment name [pyfactor-dev-env]:{NC} ").strip()
        env_name = env_name or "pyfactor-dev-env"
        
        # Ask for instance type
        instance_type = input(f"{YELLOW}Enter instance type [t3.small]:{NC} ").strip()
        instance_type = instance_type or "t3.small"
        
        # Ask for Python version
        python_version = input(f"{YELLOW}Enter Python version [3.9]:{NC} ").strip()
        python_version = python_version or "3.9"
        
        success = create_new_environment(env_name, python_version, instance_type)
    else:
        success = deploy_to_existing_environment()
    
    if success:
        print_message("\n" + "=" * 50)
        print_message("Deployment process completed!")
        print_message("=" * 50)
        
        # Check health and logs if deployment was successful
        if env_name:
            check_health_input = input(f"{YELLOW}Check application health? (y/n) [y]:{NC} ").strip().lower()
            if check_health_input == "" or check_health_input.startswith('y'):
                check_health(env_name)
            
            view_logs_input = input(f"{YELLOW}View application logs? (y/n) [y]:{NC} ").strip().lower()
            if view_logs_input == "" or view_logs_input.startswith('y'):
                view_logs(env_name)
        else:
            check_health_input = input(f"{YELLOW}Check application health? (y/n) [y]:{NC} ").strip().lower()
            if check_health_input == "" or check_health_input.startswith('y'):
                check_health()
            
            view_logs_input = input(f"{YELLOW}View application logs? (y/n) [y]:{NC} ").strip().lower()
            if view_logs_input == "" or view_logs_input.startswith('y'):
                view_logs()
    
    print_message("\nFor more information, refer to:")
    print_message(f"  - Deployment summary: {os.path.join(SCRIPT_DIR, 'Version0005_deployment_summary.md')}")
    print_message(f"  - EB deployment fixes: {os.path.join(SCRIPT_DIR, 'EB_Deployment_Fixes.md')}")
    print_message(f"  - README: {os.path.join(PROJECT_DIR, 'README_DEPLOYMENT.md')}")
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n")
        print_warning("Deployment interrupted by user.")
        sys.exit(1)
