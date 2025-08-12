#!/bin/bash

# Version 0082: Complete Lightweight OAuth API Deployment
# 
# CRITICAL: AWS Elastic Beanstalk has a 500MB package size limit
# This script creates a minimal deployment package and ensures S3 bucket exists
# FIXED: Create S3 bucket before uploading
#
# Date: 2025-05-29
# Purpose: Deploy OAuth API endpoints with minimal package size
# Issue: S3 bucket for deployments doesn't exist

set -e

echo "=== Version 0082: Complete Lightweight OAuth API Deployment ==="
echo "⚠️  IMPORTANT: AWS Elastic Beanstalk has a 500MB package size limit"
echo "🔍 Current directory: $(pwd)"

# Application name and version
APP_NAME="Dott"
VERSION_LABEL="oauth-api-v0082-$(date +%Y%m%d-%H%M%S)"
DEPLOYMENT_DIR="lightweight_deployment_$(date +%Y%m%d_%H%M%S)"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
S3_BUCKET="elasticbeanstalk-deployments-${ACCOUNT_ID}"

echo "📦 Creating lightweight deployment package..."

# Create clean deployment directory
mkdir -p "$DEPLOYMENT_DIR"

echo "📋 Copying essential files only..."

# Copy essential Python files and directories
cp -r custom_auth "$DEPLOYMENT_DIR/"
cp -r users "$DEPLOYMENT_DIR/"
cp -r onboarding "$DEPLOYMENT_DIR/"
cp -r pyfactor "$DEPLOYMENT_DIR/"
cp -r health "$DEPLOYMENT_DIR/"

# Copy configuration files
cp requirements-eb.txt "$DEPLOYMENT_DIR/"
cp manage.py "$DEPLOYMENT_DIR/"
cp run_server.py "$DEPLOYMENT_DIR/"

# Copy EB configuration
if [ -d ".ebextensions" ]; then
    cp -r .ebextensions "$DEPLOYMENT_DIR/"
fi

# Create .ebignore to exclude unnecessary files
cat > "$DEPLOYMENT_DIR/.ebignore" << 'EOF'
# Development files
*.pyc
__pycache__/
.git/
.gitignore
node_modules/
.venv/
venv/
.env.local
.env.development

# Large directories and files
scripts/
docs/
*.zip
*.tar.gz
*.log
temp_*/
fixed_package/
deployment_*/
lightweight_deployment_*/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Cache and temporary files
*.cache
.pytest_cache/
.coverage
*.tmp

# Backup files
*.backup
*.bak
*_backup_*
EOF

echo "📏 Checking package size..."
PACKAGE_SIZE=$(du -sm "$DEPLOYMENT_DIR" | cut -f1)
echo "📦 Package size: ${PACKAGE_SIZE}MB"

if [ "$PACKAGE_SIZE" -gt 450 ]; then
    echo "⚠️  WARNING: Package size (${PACKAGE_SIZE}MB) is approaching the 500MB limit!"
    echo "🔍 Largest directories in package:"
    du -sm "$DEPLOYMENT_DIR"/* | sort -nr | head -10
fi

if [ "$PACKAGE_SIZE" -gt 500 ]; then
    echo "❌ ERROR: Package size (${PACKAGE_SIZE}MB) exceeds the 500MB Elastic Beanstalk limit!"
    echo "🛠️  Please reduce package size before deployment"
    exit 1
fi

echo "✅ Package size is within limits (${PACKAGE_SIZE}MB < 500MB)"

# Create deployment package
echo "📦 Creating ZIP package..."
cd "$DEPLOYMENT_DIR"
ZIP_FILE="../${APP_NAME}-${VERSION_LABEL}.zip"
zip -r "$ZIP_FILE" . -x "*.git*" "*.DS_Store*" "__pycache__*" "*.pyc"
cd ..

ZIP_SIZE=$(du -sm "${APP_NAME}-${VERSION_LABEL}.zip" | cut -f1)
echo "📦 ZIP file size: ${ZIP_SIZE}MB"

if [ "$ZIP_SIZE" -gt 500 ]; then
    echo "❌ ERROR: ZIP file (${ZIP_SIZE}MB) exceeds the 500MB Elastic Beanstalk limit!"
    exit 1
fi

echo "✅ ZIP file is within limits (${ZIP_SIZE}MB < 500MB)"

# Deploy to Elastic Beanstalk
echo "🚀 Deploying to Elastic Beanstalk..."

# Check if S3 bucket exists, create if it doesn't
echo "🪣 Checking S3 bucket: $S3_BUCKET"
if ! aws s3 ls "s3://$S3_BUCKET" >/dev/null 2>&1; then
    echo "📦 Creating S3 bucket: $S3_BUCKET"
    aws s3 mb "s3://$S3_BUCKET" --region us-east-1
    echo "✅ S3 bucket created successfully"
else
    echo "✅ S3 bucket already exists"
fi

# Upload to S3
echo "📤 Uploading to S3..."
aws s3 cp "${APP_NAME}-${VERSION_LABEL}.zip" "s3://$S3_BUCKET/"

# Create application version using uploaded file
echo "📝 Creating application version..."
aws elasticbeanstalk create-application-version \
    --application-name "$APP_NAME" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$APP_NAME-$VERSION_LABEL.zip" \
    --description "Complete Lightweight OAuth API deployment - Version 0082"

# Update environment
echo "🔄 Updating environment..."
aws elasticbeanstalk update-environment \
    --environment-name "dott-env-fixed" \
    --version-label "$VERSION_LABEL"

echo "⏳ Waiting for deployment to complete..."
aws elasticbeanstalk wait environment-updated \
    --environment-name "dott-env-fixed"

# Check deployment status
echo "🔍 Checking deployment status..."
HEALTH=$(aws elasticbeanstalk describe-environment-health \
    --environment-name "dott-env-fixed" \
    --attribute-names All \
    --query 'Status' --output text)

echo "🏥 Environment health: $HEALTH"

if [ "$HEALTH" = "Ready" ]; then
    echo "✅ Deployment successful!"
    echo "🌐 OAuth API endpoints should now be available at:"
    echo "   - https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/api/auth/signup/"
    echo "   - https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/api/users/profile/"
    echo ""
    echo "🧪 Test the endpoints:"
    echo "   curl -X GET https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/api/users/profile/"
    echo "   curl -X POST https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/api/auth/signup/"
else
    echo "⚠️  Deployment completed but environment health is: $HEALTH"
    echo "📋 Checking recent events..."
    aws elasticbeanstalk describe-events \
        --environment-name "dott-env-fixed" \
        --max-records 10
fi

# Cleanup
echo "🧹 Cleaning up temporary files..."
rm -rf "$DEPLOYMENT_DIR"
rm -f "${APP_NAME}-${VERSION_LABEL}.zip"

echo "✅ Version 0082 deployment completed!"
echo ""
echo "📊 DEPLOYMENT SUMMARY:"
echo "   • Package Size: ${PACKAGE_SIZE}MB (under 500MB limit ✅)"
echo "   • ZIP Size: ${ZIP_SIZE}MB (under 500MB limit ✅)"
echo "   • S3 Bucket: $S3_BUCKET"
echo "   • Version: $VERSION_LABEL"
echo "   • Environment: dott-env-fixed"
echo "   • Health: $HEALTH"
echo ""
echo "💡 IMPORTANT: Always ensure deployment packages stay under 500MB"
echo "   AWS Elastic Beanstalk will reject packages larger than 500MB"
echo ""
echo "🎯 NEXT STEPS:"
echo "   1. Test OAuth endpoints are working"
echo "   2. Verify frontend can call backend APIs"
echo "   3. Update Vercel environment variables if needed"
