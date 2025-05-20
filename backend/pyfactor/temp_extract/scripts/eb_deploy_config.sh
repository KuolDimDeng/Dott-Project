#!/bin/bash
# eb_deploy_config.sh
# Script to deploy application to Elastic Beanstalk after applying fixes
# Version: 1.0.0
# Date: May 15, 2025

set -e  # Exit on error

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Parent directory (project root)
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Function to display messages
print_message() {
    echo -e "${GREEN}[EB Deploy]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required commands
if ! command_exists eb; then
    print_error "AWS EB CLI is not installed. Please install it first with 'pip install awsebcli'."
    exit 1
fi

if ! command_exists python; then
    print_error "Python is not installed. Please install Python first."
    exit 1
fi

# Navigate to project directory
cd "$PROJECT_DIR" || {
    print_error "Failed to navigate to project directory: $PROJECT_DIR"
    exit 1
}

print_message "Starting Elastic Beanstalk deployment process..."
print_message "Current directory: $(pwd)"

# Check if we have the fix script
if [ ! -f "$SCRIPT_DIR/Version0001_fix_eb_deployment.py" ]; then
    print_error "Fix script not found: $SCRIPT_DIR/Version0001_fix_eb_deployment.py"
    exit 1
fi

# Run the fix script if needed
if [ "$1" != "--skip-fixes" ]; then
    print_message "Running deployment fixes..."
    python "$SCRIPT_DIR/Version0001_fix_eb_deployment.py" || {
        print_error "Failed to apply deployment fixes."
        exit 1
    }
else
    print_message "Skipping deployment fixes as requested."
fi

# Check the current EB environment status
print_message "Checking Elastic Beanstalk status..."
eb status || {
    print_warning "Unable to get EB status. Are you in an EB-initialized directory?"
    
    # Check if .elasticbeanstalk directory exists
    if [ ! -d ".elasticbeanstalk" ]; then
        print_message "Initializing Elastic Beanstalk application..."
        eb init || {
            print_error "Failed to initialize Elastic Beanstalk application."
            exit 1
        }
    fi
}

# Prompt user to confirm deployment
read -p "$(echo -e "${YELLOW}Do you want to deploy to Elastic Beanstalk now? (y/n):${NC} ")" confirm
if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    print_message "Deployment cancelled."
    exit 0
fi

# Ask if user wants to create a new environment
read -p "$(echo -e "${YELLOW}Create a new environment? (y/n):${NC} ")" create_new
if [[ $create_new == [yY] || $create_new == [yY][eE][sS] ]]; then
    # Ask for environment name
    read -p "Enter environment name (default: pyfactor-dev-env): " env_name
    env_name=${env_name:-pyfactor-dev-env}
    
    # Ask for instance type
    read -p "Enter instance type (default: t3.small): " instance_type
    instance_type=${instance_type:-t3.small}
    
    # Ask for Python version
    read -p "Enter Python version (default: 3.9): " python_version
    python_version=${python_version:-3.9}
    
    # Create new environment
    print_message "Creating new environment: $env_name with Python $python_version on $instance_type..."
    eb create "$env_name" -p "python-$python_version" -i "$instance_type" || {
        print_error "Failed to create new environment."
        exit 1
    }
else
    # Deploy to existing environment
    print_message "Deploying to existing environment..."
    eb deploy || {
        print_error "Deployment failed."
        exit 1
    }
fi

print_message "Deployment process completed."
print_message "To check the logs, run: eb logs"
print_message "To check application health, run: eb health"

exit 0
