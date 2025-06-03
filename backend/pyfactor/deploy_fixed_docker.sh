#!/bin/bash
set -e

echo "Deploying to Elastic Beanstalk (Docker - No Static Files Config)..."

# Get current application version
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VERSION_LABEL="docker-fixed-${TIMESTAMP}"

# Create deployment package
echo "Creating deployment package..."
zip -r deploy.zip . \
    -x "*.git*" \
    -x "*.venv/*" \
    -x "*__pycache__*" \
    -x "*.pyc" \
    -x "*.pyo" \
    -x "*.env" \
    -x "*.env.local" \
    -x "db.sqlite3" \
    -x "backups/*" \
    -x "scripts/*" \
    -x "deploy.zip" \
    -x "*.log"

# Check if environment options exist without static files config
if [ -f "environment-options-dott.json" ]; then
    echo "Using environment-options-dott.json (cleaned)"
    
    # Deploy with cleaned configuration
    aws elasticbeanstalk update-environment \
        --application-name Dott \
        --environment-name Dott-env-fixed \
        --version-label "$VERSION_LABEL" \
        --option-settings file://environment-options-dott.json \
        --region us-east-1
else
    echo "Deploying without additional configuration..."
    
    # Deploy without configuration file
    aws elasticbeanstalk update-environment \
        --application-name Dott \
        --environment-name Dott-env-fixed \
        --version-label "$VERSION_LABEL" \
        --region us-east-1
fi

echo "Deployment initiated. Check AWS console for status."
