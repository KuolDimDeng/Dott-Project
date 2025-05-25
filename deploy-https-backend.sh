#!/bin/bash

# HTTPS Backend Deployment Script
# Deploys Django backend to Elastic Beanstalk with HTTPS enabled
# Using existing SSL certificate for dottapps.com

set -e

echo "🔒 Deploying HTTPS-enabled backend to Elastic Beanstalk..."

# Configuration
APP_NAME="Dott"
ENV_NAME="Dott-env-https"
REGION="us-east-1"
VERSION_LABEL="https-v$(date +%Y%m%d%H%M%S)"
S3_BUCKET="elasticbeanstalk-${REGION}-471112661935"
PACKAGE_NAME="dott-https-backend-$(date +%Y%m%d%H%M%S).zip"

echo "📦 Creating HTTPS deployment package..."

# Use the existing optimized package creation script
./scripts/create_optimized_docker_package.sh

# Get the latest package name
LATEST_PACKAGE=$(ls -t optimized-docker-eb-package-*.zip | head -1)
if [ -z "$LATEST_PACKAGE" ]; then
    echo "❌ No package found. Package creation failed."
    exit 1
fi

# Rename for HTTPS deployment
mv "$LATEST_PACKAGE" "$PACKAGE_NAME"
echo "✅ Package created: $PACKAGE_NAME"

echo "📤 Uploading to S3..."
aws s3 cp "$PACKAGE_NAME" "s3://$S3_BUCKET/$PACKAGE_NAME" --region "$REGION"

echo "🚀 Creating application version..."
aws elasticbeanstalk create-application-version \
    --application-name "$APP_NAME" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$PACKAGE_NAME" \
    --region "$REGION"

echo "🌐 Creating HTTPS-enabled environment..."
aws elasticbeanstalk create-environment \
    --application-name "$APP_NAME" \
    --environment-name "$ENV_NAME" \
    --solution-stack-name "64bit Amazon Linux 2/4.1.2 running Docker" \
    --version-label "$VERSION_LABEL" \
    --option-settings file://environment-options-https.json \
    --region "$REGION"

echo "⏳ Waiting for environment to be ready..."
echo "This may take 10-15 minutes..."

# Monitor deployment
aws elasticbeanstalk wait environment-ready \
    --environment-name "$ENV_NAME" \
    --region "$REGION"

# Get environment URL
ENV_URL=$(aws elasticbeanstalk describe-environments \
    --environment-names "$ENV_NAME" \
    --region "$REGION" \
    --query 'Environments[0].CNAME' \
    --output text)

echo ""
echo "🎉 HTTPS Backend Deployment Completed!"
echo "========================================="
echo "Environment: $ENV_NAME"
echo "HTTP URL: http://$ENV_URL"
echo "HTTPS URL: https://$ENV_URL"
echo "Version: $VERSION_LABEL"
echo ""
echo "🔗 Next Steps:"
echo "1. Test HTTPS endpoint: curl https://$ENV_URL/health/"
echo "2. Update frontend configuration to use HTTPS URL"
echo "3. Configure custom domain (api.dottapps.com) to point to: $ENV_URL"
echo ""

# Cleanup
rm -f "$PACKAGE_NAME"

echo "✅ Deployment complete!" 