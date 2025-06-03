#!/bin/bash

# Version0075_fix_dependency_conflict_redeploy.sh
# Fix psycopg2-binary dependency conflict and redeploy OAuth API endpoints
# Created: 2025-05-29 06:50:33
# Author: Cline Assistant
# 
# Issue: Deployment failed due to conflicting psycopg2-binary versions (2.9.6 and 2.9.9)
# Resolution: Remove duplicate psycopg2-binary==2.9.6 entry, keep psycopg2-binary==2.9.9
# 
# Dependencies fixed:
# - psycopg2-binary==2.9.9 (kept)
# - psycopg2-binary==2.9.6 (removed duplicate)

set -e  # Exit on any error

echo "===== FIXING DEPENDENCY CONFLICT AND REDEPLOYING OAUTH API ====="
echo "This script fixes the psycopg2-binary dependency conflict and redeploys"
echo "Target Environment: Dott-env-fixed"
echo "Target Domain: Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

echo "✓ AWS CLI found at: $(which aws)"
echo "Using AWS CLI: $(aws --version)"

# Create deployment package with fixed dependencies
TIMESTAMP=$(date +%Y%m%d%H%M%S)
TEMP_DIR=$(mktemp -d)
PACKAGE_NAME="oauth-api-fixed-dependencies-${TIMESTAMP}.zip"

echo "Creating fixed OAuth API deployment package..."
echo "Using temporary directory: $TEMP_DIR"

# Copy Django application files
echo "Copying Django application files..."
cp -r . "$TEMP_DIR/"

# Clean up package
echo "Cleaning up package..."
cd "$TEMP_DIR"

# Remove development files and directories
rm -rf .git .env .venv __pycache__ *.pyc node_modules .DS_Store
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true

# Verify requirements-eb.txt has fixed dependencies
echo "Verifying fixed dependencies in requirements-eb.txt..."
PSYCOPG_COUNT=$(grep -c "^psycopg2-binary==" requirements-eb.txt || true)
if [ "$PSYCOPG_COUNT" -gt 1 ]; then
    echo "❌ ERROR: Multiple psycopg2-binary entries found in requirements-eb.txt"
    echo "Found $PSYCOPG_COUNT entries. There should be only one."
    exit 1
fi

echo "✓ Dependencies verified - single psycopg2-binary entry found"

# Show which OAuth files are included
echo "OAuth API files included:"
if [ -f "custom_auth/api/views/auth_views.py" ]; then
    echo "✓ custom_auth/api/views/auth_views.py"
else
    echo "❌ custom_auth/api/views/auth_views.py not found"
    exit 1
fi

if [ -f "custom_auth/api/urls.py" ]; then
    echo "✓ custom_auth/api/urls.py"
else
    echo "❌ custom_auth/api/urls.py not found"
    exit 1
fi

# Create deployment package
echo "Creating deployment package..."
zip -r "$PACKAGE_NAME" . -q
PACKAGE_SIZE=$(ls -lh "$PACKAGE_NAME" | awk '{print $5}')
echo "Created package: $PACKAGE_NAME ($PACKAGE_SIZE)"

# Upload to S3
S3_BUCKET="dott-app-deployments-dockerebmanual001"
S3_KEY="oauth-api-fixed-$PACKAGE_NAME"

echo "Uploading fixed package to S3..."
aws s3 cp "$PACKAGE_NAME" "s3://$S3_BUCKET/$S3_KEY"

if [ $? -eq 0 ]; then
    echo "✓ Package uploaded successfully!"
else
    echo "❌ Failed to upload package to S3"
    exit 1
fi

# Create application version
APP_NAME="Dott"
VERSION_LABEL="OAuth-API-Fixed-V${TIMESTAMP}"
DESCRIPTION="OAuth API endpoints with fixed psycopg2-binary dependency conflict"

echo "Creating application version from S3..."
aws elasticbeanstalk create-application-version \
    --application-name "$APP_NAME" \
    --version-label "$VERSION_LABEL" \
    --description "$DESCRIPTION" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY"

if [ $? -eq 0 ]; then
    echo "✓ Application version created successfully!"
else
    echo "❌ Failed to create application version"
    exit 1
fi

# Update environment
ENV_NAME="Dott-env-fixed"
echo "Updating $ENV_NAME environment with fixed OAuth API endpoints..."
echo "This will deploy the OAuth endpoints with resolved dependency conflicts:"
echo "  - /api/auth/signup/ (POST)"
echo "  - /api/auth/profile/ (GET/PATCH)"
echo "  - /api/auth/verify-session/ (GET)"
echo "  - /api/auth/check-attributes/ (POST)"
echo "  - /api/auth/verify-tenant/ (POST)"

aws elasticbeanstalk update-environment \
    --environment-name "$ENV_NAME" \
    --version-label "$VERSION_LABEL"

if [ $? -eq 0 ]; then
    echo "✓ Environment update initiated successfully!"
else
    echo "❌ Failed to update environment"
    exit 1
fi

# Wait for deployment to complete
echo "Waiting for fixed OAuth API deployment to complete..."
echo "This may take 3-5 minutes. Please be patient."
echo "The OAuth endpoints will be available after deployment."

MAX_ATTEMPTS=30
ATTEMPT=1
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    ENV_STATUS=$(aws elasticbeanstalk describe-environments \
        --environment-names "$ENV_NAME" \
        --query 'Environments[0].Status' --output text)
    
    ENV_HEALTH=$(aws elasticbeanstalk describe-environments \
        --environment-names "$ENV_NAME" \
        --query 'Environments[0].Health' --output text)
    
    echo "[$ATTEMPT/$MAX_ATTEMPTS] Status: $ENV_STATUS, Health: $ENV_HEALTH"
    
    if [ "$ENV_STATUS" = "Ready" ]; then
        break
    fi
    
    sleep 10
    ATTEMPT=$((ATTEMPT + 1))
done

# Get final status
FINAL_STATUS=$(aws elasticbeanstalk describe-environments \
    --environment-names "$ENV_NAME" \
    --query 'Environments[0].Status' --output text)

FINAL_HEALTH=$(aws elasticbeanstalk describe-environments \
    --environment-names "$ENV_NAME" \
    --query 'Environments[0].Health' --output text)

FINAL_VERSION=$(aws elasticbeanstalk describe-environments \
    --environment-names "$ENV_NAME" \
    --query 'Environments[0].VersionLabel' --output text)

DOMAIN=$(aws elasticbeanstalk describe-environments \
    --environment-names "$ENV_NAME" \
    --query 'Environments[0].CNAME' --output text)

echo ""
echo "======== FIXED OAUTH API DEPLOYMENT COMPLETE ========"
echo "Application: $APP_NAME"
echo "Environment: $ENV_NAME"
echo "Status: $FINAL_STATUS"
echo "Health: $FINAL_HEALTH"
echo "Version: $FINAL_VERSION"
echo "Domain: $DOMAIN"
echo "==============================================="

if [ "$FINAL_STATUS" = "Ready" ] && [ "$FINAL_HEALTH" != "Severe" ]; then
    echo "OAuth API Endpoints Now Available:"
    echo "✓ POST https://$DOMAIN/api/auth/signup/"
    echo "✓ GET  https://$DOMAIN/api/auth/profile/"
    echo "✓ GET  https://$DOMAIN/api/auth/verify-session/"
    echo "✓ POST https://$DOMAIN/api/auth/check-attributes/"
    echo "✓ POST https://$DOMAIN/api/auth/verify-tenant/"
    echo ""
    echo "🎉 The dependency conflict has been resolved!"
    echo "🎉 The Google OAuth onboarding flow should now work correctly!"
else
    echo "⚠️  Deployment completed but environment health is: $FINAL_HEALTH"
    echo "⚠️  Please check AWS Console for detailed error information"
fi

# Cleanup
echo "Cleaning up deployment package..."
cd /
rm -rf "$TEMP_DIR"
echo "✓ Cleanup complete"

echo ""
echo "===== DEPLOYMENT SUMMARY ====="
echo "• Fixed dependency conflict: psycopg2-binary versions"
echo "• Redeployed OAuth API endpoints"
echo "• Environment Status: $FINAL_STATUS"
echo "• Environment Health: $FINAL_HEALTH"
echo "• Package: $PACKAGE_NAME ($PACKAGE_SIZE)"
echo "• Version: $VERSION_LABEL"
echo "============================="
