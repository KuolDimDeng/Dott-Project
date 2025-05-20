#!/bin/bash
# eb_recreate_env.sh
# Script to recreate an Elastic Beanstalk environment from scratch
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

# Default values
DEFAULT_ENV_NAME="pyfactor-dev-env"
DEFAULT_INSTANCE_TYPE="t3.small"
DEFAULT_PYTHON_VERSION="3.9"
DEFAULT_KEY_NAME="aws-eb"

# Function to display messages
print_message() {
    echo -e "${GREEN}[EB Recreate]${NC} $1"
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

# Show help message
show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help                  Show this help message"
    echo "  -e, --env-name NAME         Environment name (default: $DEFAULT_ENV_NAME)"
    echo "  -i, --instance-type TYPE    Instance type (default: $DEFAULT_INSTANCE_TYPE)"
    echo "  -p, --python-version VER    Python version (default: $DEFAULT_PYTHON_VERSION)"
    echo "  -k, --key-name KEY          EC2 key pair name (default: $DEFAULT_KEY_NAME)"
    echo "  -y, --yes                   Skip confirmation prompts"
    echo "  -s, --skip-fixes            Skip running the deployment fixes"
    echo ""
    echo "Example:"
    echo "  $0 --env-name pyfactor-prod --instance-type t3.medium"
}

# Parse command line arguments
POSITIONAL=()
SKIP_CONFIRMATION=false
SKIP_FIXES=false

while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -h|--help)
      show_help
      exit 0
      ;;
    -e|--env-name)
      ENV_NAME="$2"
      shift 2
      ;;
    -i|--instance-type)
      INSTANCE_TYPE="$2"
      shift 2
      ;;
    -p|--python-version)
      PYTHON_VERSION="$2"
      shift 2
      ;;
    -k|--key-name)
      KEY_NAME="$2"
      shift 2
      ;;
    -y|--yes)
      SKIP_CONFIRMATION=true
      shift
      ;;
    -s|--skip-fixes)
      SKIP_FIXES=true
      shift
      ;;
    *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done

# Set back positional parameters
set -- "${POSITIONAL[@]}"

# Set defaults if not provided
ENV_NAME=${ENV_NAME:-$DEFAULT_ENV_NAME}
INSTANCE_TYPE=${INSTANCE_TYPE:-$DEFAULT_INSTANCE_TYPE}
PYTHON_VERSION=${PYTHON_VERSION:-$DEFAULT_PYTHON_VERSION}
KEY_NAME=${KEY_NAME:-$DEFAULT_KEY_NAME}

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

print_message "Starting Elastic Beanstalk environment recreation process..."
print_message "Current directory: $(pwd)"

# Run the fix script if needed
if [ "$SKIP_FIXES" != "true" ]; then
    if [ ! -f "$SCRIPT_DIR/Version0001_fix_eb_deployment.py" ]; then
        print_error "Fix script not found: $SCRIPT_DIR/Version0001_fix_eb_deployment.py"
        exit 1
    fi

    print_message "Running deployment fixes..."
    python "$SCRIPT_DIR/Version0001_fix_eb_deployment.py" || {
        print_error "Failed to apply deployment fixes."
        exit 1
    }
else
    print_message "Skipping deployment fixes as requested."
fi

# Check if .elasticbeanstalk directory exists
if [ ! -d ".elasticbeanstalk" ]; then
    print_message "Initializing Elastic Beanstalk application..."
    eb init || {
        print_error "Failed to initialize Elastic Beanstalk application."
        exit 1
    }
fi

# Check if environment already exists
ENV_EXISTS=false
if eb status "$ENV_NAME" &>/dev/null; then
    ENV_EXISTS=true
    
    if [ "$SKIP_CONFIRMATION" != "true" ]; then
        read -p "$(echo -e "${YELLOW}Environment $ENV_NAME already exists. Do you want to terminate it and recreate? (y/n):${NC} ")" confirm
        if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
            print_message "Recreation cancelled."
            exit 0
        fi
    fi
    
    print_message "Terminating environment $ENV_NAME..."
    eb terminate "$ENV_NAME" --force || {
        print_error "Failed to terminate existing environment."
        exit 1
    }
fi

# Create new environment
print_message "Creating new environment: $ENV_NAME with Python $PYTHON_VERSION on $INSTANCE_TYPE..."
eb create "$ENV_NAME" -p "python-$PYTHON_VERSION" -i "$INSTANCE_TYPE" -k "$KEY_NAME" || {
    print_error "Failed to create new environment."
    exit 1
}

print_message "Environment recreation process completed."
print_message "To check the logs, run: eb logs"
print_message "To check application health, run: eb health"

exit 0
