#!/bin/bash
# deploy_fixed_env.sh
# Created by Version0011_ultimate_dependency_fix.py
# Script to deploy to Elastic Beanstalk with enforced dependency versions

set -e  # Exit on error

# Environment settings
ENV_NAME="pyfactor-prod"  # Use your environment name here

echo "====================================================="
echo "   DEPLOYING WITH FIXED DEPENDENCIES"
echo "====================================================="
echo "Environment: $ENV_NAME"
echo "Starting at: $(date)"
echo "====================================================="

# Use simplified requirements for deployment
if [ -f "requirements-simple.txt" ]; then
    echo "Using simplified requirements file for clean deployment"
    cp requirements.txt requirements.txt.original
    cp requirements-simple.txt requirements.txt
fi

# Create prebuild verification script
mkdir -p .platform/hooks/prebuild
cat > .platform/hooks/prebuild/01_verify_no_conflicts.sh << 'EOL'
#!/bin/bash
echo "Checking for conflicting dependencies..."
if grep -E "urllib3==2|urllib3==3" requirements.txt; then
    echo "ERROR: Found incompatible urllib3 version in requirements.txt"
    exit 1
fi

echo "No conflicting dependencies found"
chmod +x .platform/hooks/prebuild/01_verify_no_conflicts.sh
EOL

# Deploy the application
echo "Deploying to Elastic Beanstalk..."
if eb status $ENV_NAME &>/dev/null; then
    # Environment exists, update it
    echo "Updating existing environment: $ENV_NAME"
    eb deploy $ENV_NAME --timeout 20 --verbose
else
    # Create new environment
    echo "Creating new environment: $ENV_NAME"
    eb create $ENV_NAME \
        --platform "python-3.9" \
        --instance-type "t3.small" \
        --single \
        --timeout 20 \
        --verbose
fi

# Restore original requirements if backed up
if [ -f "requirements.txt.original" ]; then
    echo "Restoring original requirements file"
    mv requirements.txt.original requirements.txt
fi

echo "====================================================="
echo "   DEPLOYMENT COMPLETE"
echo "====================================================="
echo "Completed at: $(date)"
echo "To check environment health: eb status $ENV_NAME"
echo "To view logs: eb logs $ENV_NAME"
echo "To open the application: eb open $ENV_NAME"
echo "====================================================="
