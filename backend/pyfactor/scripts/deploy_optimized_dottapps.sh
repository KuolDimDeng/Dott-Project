#!/bin/bash

# DottApps Optimized Deployment Script
# Creates a minimal package under 500MB limit

set -e

echo "=========================================="
echo "DottApps Optimized Deployment Script"
echo "=========================================="

# Configuration
APP_NAME="DottApps"
ENV_NAME="DottApps-env"
REGION="us-east-1"
SOLUTION_STACK="64bit Amazon Linux 2/4.1.2 running Docker"
VERSION_LABEL="app-$(date +%y%m%d_%H%M%S)$(uuidgen | cut -c1-6)"
S3_BUCKET="elasticbeanstalk-${REGION}-471112661935"
PACKAGE_FILE="dottapps-optimized-$(date +%y%m%d_%H%M%S).zip"

echo "Using version label: $VERSION_LABEL"
echo "Target S3 bucket: $S3_BUCKET"

# Step 1: Create optimized deployment package
echo "Step 1: Creating optimized deployment package..."
cd /Users/kuoldeng/projectx/backend/pyfactor

# Create temporary directory for clean package
TEMP_DIR="temp_deploy_$(date +%s)"
mkdir -p "$TEMP_DIR"

echo "Copying essential files only..."

# Copy core application files
cp -r pyfactor "$TEMP_DIR/"
cp -r custom_auth "$TEMP_DIR/"
cp -r onboarding "$TEMP_DIR/"
cp -r hr "$TEMP_DIR/"
cp -r finance "$TEMP_DIR/"
cp -r inventory "$TEMP_DIR/"
cp -r sales "$TEMP_DIR/"
cp -r banking "$TEMP_DIR/"
cp -r payments "$TEMP_DIR/"
cp -r payroll "$TEMP_DIR/"
cp -r reports "$TEMP_DIR/"
cp -r crm "$TEMP_DIR/"
cp -r analysis "$TEMP_DIR/"
cp -r chart "$TEMP_DIR/"
cp -r integrations "$TEMP_DIR/"
cp -r purchases "$TEMP_DIR/"
cp -r health "$TEMP_DIR/"

# Copy configuration files
cp Dockerfile "$TEMP_DIR/"
cp Dockerrun.aws.json "$TEMP_DIR/"
cp requirements.txt "$TEMP_DIR/"
cp manage.py "$TEMP_DIR/"
cp application.py "$TEMP_DIR/"

# Copy EB extensions (only the fixed ones)
mkdir -p "$TEMP_DIR/.ebextensions"
cp .ebextensions/02_docker_config.config "$TEMP_DIR/.ebextensions/"

# Create static files directory structure (empty for now)
mkdir -p "$TEMP_DIR/static"
mkdir -p "$TEMP_DIR/staticfiles"
mkdir -p "$TEMP_DIR/media"
mkdir -p "$TEMP_DIR/logs"

# Create the optimized package
cd "$TEMP_DIR"
zip -r "../$PACKAGE_FILE" . -x "*.pyc" "*__pycache__*" "*.git*"

cd ..
rm -rf "$TEMP_DIR"

# Check package size
PACKAGE_SIZE=$(stat -f%z "$PACKAGE_FILE" 2>/dev/null || stat -c%s "$PACKAGE_FILE")
PACKAGE_SIZE_MB=$((PACKAGE_SIZE / 1024 / 1024))

echo "Package created: $PACKAGE_FILE"
echo "Package size: ${PACKAGE_SIZE_MB}MB"

if [ $PACKAGE_SIZE -gt 524288000 ]; then
    echo "❌ Package still too large (${PACKAGE_SIZE_MB}MB > 500MB)"
    rm -f "$PACKAGE_FILE"
    exit 1
fi

# Step 2: Upload to S3
echo "Step 2: Uploading optimized package to S3..."
aws s3 cp "$PACKAGE_FILE" "s3://$S3_BUCKET/$PACKAGE_FILE" --region "$REGION"

echo "Package uploaded successfully."

# Step 3: Create application version
echo "Step 3: Creating application version..."
aws elasticbeanstalk create-application-version \
    --application-name "$APP_NAME" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$PACKAGE_FILE" \
    --region "$REGION"

echo "Application version created: $VERSION_LABEL"

# Step 4: Create new environment with fixed configuration
echo "Step 4: Creating new environment..."
aws elasticbeanstalk create-environment \
    --application-name "$APP_NAME" \
    --environment-name "$ENV_NAME" \
    --solution-stack-name "$SOLUTION_STACK" \
    --version-label "$VERSION_LABEL" \
    --option-settings file://environment-options-fixed.json \
    --region "$REGION"

echo "Environment creation initiated..."

# Step 5: Wait for environment to be ready
echo "Step 5: Waiting for environment to be ready..."
echo "This may take 10-15 minutes..."

aws elasticbeanstalk wait environment-ready \
    --environment-name "$ENV_NAME" \
    --region "$REGION"

# Step 6: Get environment info
echo "Step 6: Getting environment information..."
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
        echo "You can check logs with: aws logs get-log-events --log-group-name '/aws/elasticbeanstalk/$ENV_NAME/var/log/eb-docker/containers/eb-current-app/stdouterr.log'"
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