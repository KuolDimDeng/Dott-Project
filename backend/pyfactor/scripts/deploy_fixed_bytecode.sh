#!/bin/bash
# deploy_fixed_bytecode.sh
# Script to deploy the fixed package that addresses bytecode issues
# Created by Version0016_fix_pyc_bytecode_files.py

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PACKAGE_ZIP="optimized-clean-package.zip"

echo "========================================================"
echo "   AWS ELASTIC BEANSTALK DEPLOYMENT - BYTECODE FIX"
echo "========================================================"
echo "This script will deploy the fixed package that addresses"
echo "Python bytecode file issues in Elastic Beanstalk."
echo "------------------------------------------------------"

# Check if application exists
cd "$BACKEND_DIR"
if [ ! -f "$PACKAGE_ZIP" ]; then
    echo "ERROR: Deployment package not found: $PACKAGE_ZIP"
    echo "Run the fix script first: python scripts/Version0016_fix_pyc_bytecode_files.py"
    exit 1
fi

# Check for EB CLI
if ! command -v eb &> /dev/null; then
    echo "AWS Elastic Beanstalk CLI (eb) not found."
    echo "Would you like to deploy through the AWS Console instead? (y/n)"
    read -r deploy_console
    
    if [[ "$deploy_console" == "y" ]]; then
        echo "------------------------------------------------------"
        echo "MANUAL DEPLOYMENT INSTRUCTIONS:"
        echo "1. Go to AWS Elastic Beanstalk Console"
        echo "2. Select your application and environment"
        echo "3. Click 'Upload and deploy'"
        echo "4. Upload this file: $BACKEND_DIR/$PACKAGE_ZIP"
        echo "5. Click 'Deploy'"
        echo "------------------------------------------------------"
        exit 0
    else
        echo "Please install the EB CLI and try again:"
        echo "pip install awsebcli"
        exit 1
    fi
fi

# Get environment name
echo "------------------------------------------------------"
echo "Available Elastic Beanstalk environments:"
eb list

echo "------------------------------------------------------"
echo "Enter the name of the environment to deploy to:"
read -r environment_name

# Deploy the application
echo "------------------------------------------------------"
echo "Deploying $PACKAGE_ZIP to environment: $environment_name"
echo "This may take several minutes..."
echo "------------------------------------------------------"

eb deploy "$environment_name" --staged

echo "------------------------------------------------------"
echo "Deployment complete! Check the AWS console for status."
echo "------------------------------------------------------"
