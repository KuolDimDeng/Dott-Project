#!/bin/bash

# DottApps Fixed Deployment Script
# This script terminates the failed environment and redeploys with fixed configuration

set -e

echo "=========================================="
echo "DottApps Fixed Deployment Script"
echo "=========================================="

# Configuration
APP_NAME="DottApps"
ENV_NAME="DottApps-env"
REGION="us-east-1"
SOLUTION_STACK="64bit Amazon Linux 2/4.1.2 running Docker"
VERSION_LABEL="app-$(date +%y%m%d_%H%M%S)$(uuidgen | cut -c1-6)"
S3_BUCKET="elasticbeanstalk-${REGION}-471112661935"
PACKAGE_FILE="dottapps-fixed-$(date +%y%m%d_%H%M%S).zip"

echo "Using version label: $VERSION_LABEL"
echo "Target S3 bucket: $S3_BUCKET"

# Step 1: Terminate the failed environment
echo "Step 1: Terminating failed environment..."
aws elasticbeanstalk terminate-environment \
    --environment-name "$ENV_NAME" \
    --region "$REGION" \
    --terminate-resources

echo "Waiting for environment termination..."
aws elasticbeanstalk wait environment-terminated \
    --environment-name "$ENV_NAME" \
    --region "$REGION"

echo "Environment terminated successfully."

# Step 2: Create deployment package
echo "Step 2: Creating deployment package..."
cd /Users/kuoldeng/projectx/backend/pyfactor

# Create a clean package excluding problematic files
zip -r "$PACKAGE_FILE" . \
    -x "*.git*" \
    -x "*__pycache__*" \
    -x "*.pyc" \
    -x "*logs/*" \
    -x "*venv/*" \
    -x "*env/*" \
    -x "*.env" \
    -x "*node_modules*" \
    -x "*.DS_Store*" \
    -x "*.backup*" \
    -x "*deployment_backups/*" \
    -x "*backups/*" \
    -x "*.sql" \
    -x "*dump.rdb*"

echo "Package created: $PACKAGE_FILE"

# Step 3: Upload to S3
echo "Step 3: Uploading package to S3..."
aws s3 cp "$PACKAGE_FILE" "s3://$S3_BUCKET/$PACKAGE_FILE" --region "$REGION"

echo "Package uploaded successfully."

# Step 4: Create application version
echo "Step 4: Creating application version..."
aws elasticbeanstalk create-application-version \
    --application-name "$APP_NAME" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$PACKAGE_FILE" \
    --region "$REGION"

echo "Application version created: $VERSION_LABEL"

# Step 5: Create new environment with fixed configuration
echo "Step 5: Creating new environment..."
aws elasticbeanstalk create-environment \
    --application-name "$APP_NAME" \
    --environment-name "$ENV_NAME" \
    --solution-stack-name "$SOLUTION_STACK" \
    --version-label "$VERSION_LABEL" \
    --option-settings file://environment-options-fixed.json \
    --region "$REGION"

echo "Environment creation initiated..."

# Step 6: Wait for environment to be ready
echo "Step 6: Waiting for environment to be ready..."
echo "This may take 10-15 minutes..."

aws elasticbeanstalk wait environment-ready \
    --environment-name "$ENV_NAME" \
    --region "$REGION"

# Step 7: Get environment info
echo "Step 7: Getting environment information..."
ENV_INFO=$(aws elasticbeanstalk describe-environments \
    --environment-names "$ENV_NAME" \
    --region "$REGION" \
    --query 'Environments[0].[EnvironmentName,Status,Health,EndpointURL]' \
    --output text)

echo "=========================================="
echo "DEPLOYMENT COMPLETED"
echo "=========================================="
echo "Environment: $ENV_INFO"

# Get the endpoint URL
ENDPOINT_URL=$(aws elasticbeanstalk describe-environments \
    --environment-names "$ENV_NAME" \
    --region "$REGION" \
    --query 'Environments[0].EndpointURL' \
    --output text)

if [ "$ENDPOINT_URL" != "None" ] && [ -n "$ENDPOINT_URL" ]; then
    echo "Application URL: http://$ENDPOINT_URL"
    echo "Health check: http://$ENDPOINT_URL/health/"
    
    # Test the health endpoint
    echo "Testing health endpoint..."
    sleep 30  # Give the app time to start
    
    if curl -f "http://$ENDPOINT_URL/health/" > /dev/null 2>&1; then
        echo "✅ Health check passed!"
    else
        echo "❌ Health check failed. Check the logs."
    fi
else
    echo "❌ No endpoint URL available. Check environment status."
fi

echo "=========================================="
echo "Deployment script completed."
echo "Check AWS Console for detailed status."
echo "=========================================="

# Cleanup
rm -f "$PACKAGE_FILE"