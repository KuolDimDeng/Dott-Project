#!/bin/bash
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
eb create $ENV_NAME \
    --platform "$PLATFORM" \
    --instance-type "$INSTANCE_TYPE" \
    --single \
    --timeout 20 \
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
