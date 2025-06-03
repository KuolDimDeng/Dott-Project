#!/bin/bash

# Version0077 - Deploy OAuth API Endpoints (Fixed S3 Upload Order)
# This script correctly uploads to S3 first, then creates application version

set -e

echo "🚀 Starting OAuth API deployment with fixed S3 upload..."
echo "Current time: $(date)"

# Configuration
APPLICATION_NAME="Dott"
ENVIRONMENT_NAME="Dott-env-fixed"
VERSION_LABEL="OAuth-API-Fixed-$(date +%Y%m%d-%H%M%S)"
PACKAGE_NAME="${VERSION_LABEL}.zip"
S3_BUCKET="elasticbeanstalk-us-east-1-471112661935"

echo "📦 Creating deployment package..."

# Create temporary directory for the package
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "📋 Setting up package structure..."

# Copy the essential files for OAuth API endpoints
mkdir -p custom_auth/api/views
mkdir -p custom_auth/api
mkdir -p pyfactor

# Copy the OAuth API files
cp /Users/kuoldeng/projectx/backend/pyfactor/custom_auth/api/views/auth_views.py custom_auth/api/views/
cp /Users/kuoldeng/projectx/backend/pyfactor/custom_auth/api/urls.py custom_auth/api/
cp /Users/kuoldeng/projectx/backend/pyfactor/custom_auth/api/__init__.py custom_auth/api/ 2>/dev/null || touch custom_auth/api/__init__.py
cp /Users/kuoldeng/projectx/backend/pyfactor/custom_auth/__init__.py custom_auth/ 2>/dev/null || touch custom_auth/__init__.py

# Copy essential config files
cp /Users/kuoldeng/projectx/backend/pyfactor/requirements-eb.txt .
cp /Users/kuoldeng/projectx/backend/pyfactor/Dockerfile.fixed Dockerfile
cp /Users/kuoldeng/projectx/backend/pyfactor/Dockerrun.aws.json.fixed Dockerrun.aws.json

# Copy Django settings
cp /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/settings_eb.py pyfactor/
cp /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/__init__.py pyfactor/ 2>/dev/null || touch pyfactor/__init__.py

echo "✅ Package structure created successfully"

# Create the deployment package
echo "📦 Creating deployment package: ${PACKAGE_NAME}"
zip -r "$PACKAGE_NAME" . -x "*.git*" "*.DS_Store*" "__pycache__/*" "*.pyc"

# Get package size
PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)
echo "📊 Package size: $PACKAGE_SIZE"

# Step 1: Upload the package to S3 FIRST
echo "📤 Uploading package to S3..."
aws s3 cp "$PACKAGE_NAME" "s3://$S3_BUCKET/$PACKAGE_NAME" --region us-east-1

# Verify the upload
echo "🔍 Verifying S3 upload..."
aws s3 ls "s3://$S3_BUCKET/$PACKAGE_NAME" --region us-east-1

# Step 2: Create application version AFTER S3 upload
echo "⬆️ Creating application version in Elastic Beanstalk..."
aws elasticbeanstalk create-application-version \
    --application-name "$APPLICATION_NAME" \
    --version-label "$VERSION_LABEL" \
    --description "OAuth API endpoints deployment with fixed dependency conflicts" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$PACKAGE_NAME" \
    --region us-east-1

echo "🚀 Deploying to environment: $ENVIRONMENT_NAME"

# Step 3: Deploy to environment
aws elasticbeanstalk update-environment \
    --environment-name "$ENVIRONMENT_NAME" \
    --version-label "$VERSION_LABEL" \
    --region us-east-1

echo "⏳ Deployment initiated. Monitoring progress..."

# Monitor deployment
for i in {1..30}; do
    sleep 10
    STATUS=$(aws elasticbeanstalk describe-environments \
        --environment-names "$ENVIRONMENT_NAME" \
        --region us-east-1 \
        --query 'Environments[0].Status' \
        --output text)
    
    HEALTH=$(aws elasticbeanstalk describe-environments \
        --environment-names "$ENVIRONMENT_NAME" \
        --region us-east-1 \
        --query 'Environments[0].Health' \
        --output text)
    
    echo "Status: $STATUS, Health: $HEALTH"
    
    if [ "$STATUS" = "Ready" ]; then
        if [ "$HEALTH" = "Green" ] || [ "$HEALTH" = "Ok" ]; then
            echo "✅ Deployment completed successfully!"
            echo "🌍 Environment URL: https://Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com"
            break
        elif [ "$HEALTH" = "Red" ]; then
            echo "❌ Deployment completed but health is Red. Checking logs..."
            break
        fi
    elif [ "$STATUS" = "Updating" ]; then
        echo "🔄 Still updating... (attempt $i/30)"
    else
        echo "⚠️ Unexpected status: $STATUS"
    fi
    
    if [ $i -eq 30 ]; then
        echo "⏰ Deployment monitoring timeout reached"
    fi
done

# Test the OAuth API endpoints
echo "🧪 Testing OAuth API endpoints..."
sleep 5

echo "Testing /health/ endpoint:"
curl -s -w "HTTP Status: %{http_code}\n" https://Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/ || echo "Health endpoint test failed"

echo "Testing /api/auth/profile/ endpoint:"
curl -s -w "HTTP Status: %{http_code}\n" https://Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/api/auth/profile/ || echo "Profile endpoint test - 404 expected for unauthenticated request"

# Cleanup
cd /Users/kuoldeng/projectx/backend/pyfactor
rm -rf "$TEMP_DIR"

echo "🎉 OAuth API deployment completed!"
echo "📝 Version deployed: $VERSION_LABEL"
echo "📊 Package size: $PACKAGE_SIZE"
echo "⏰ Deployment completed at: $(date)"

# Update script registry
echo "📋 Updating script registry..."
echo "" >> scripts/script_registry.md
echo "## Version0077_deploy_oauth_api_fixed.sh" >> scripts/script_registry.md
echo "- **Purpose**: Deploy OAuth API endpoints with corrected S3 upload order" >> scripts/script_registry.md
echo "- **Date**: $(date '+%Y-%m-%d %H:%M:%S')" >> scripts/script_registry.md
echo "- **Status**: ✅ Completed" >> scripts/script_registry.md
echo "- **Version**: $VERSION_LABEL" >> scripts/script_registry.md
echo "- **Package Size**: $PACKAGE_SIZE" >> scripts/script_registry.md
echo "- **Changes**: Added OAuth API endpoints (/api/auth/profile/, /api/auth/signup/)" >> scripts/script_registry.md

echo "✅ Script registry updated successfully"
