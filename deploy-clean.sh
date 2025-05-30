#!/bin/bash

# Clean deployment to AWS Elastic Beanstalk
# Creates minimal deployment package with only necessary files

set -e

echo "🚀 Starting CLEAN deployment to AWS Elastic Beanstalk..."
echo "======================================================="

# Configuration
APP_NAME="DottApp"
ENV_NAME="DottApp-simple"
REGION="us-east-1"
S3_BUCKET="elasticbeanstalk-${REGION}-471112661935"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed.${NC}"
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")/backend/pyfactor"

# Create temporary deployment directory
echo -e "\n📦 Creating clean deployment package..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEMP_DIR="deploy_temp_${TIMESTAMP}"
ZIP_FILE="deploy-${TIMESTAMP}.zip"

# Clean up any existing temp directories and zip files
rm -rf deploy_temp_*
rm -f deploy-*.zip

# Create temp directory
mkdir -p "$TEMP_DIR"

# Copy only necessary files
echo "Copying essential files..."

# Copy Python application files
cp -r pyfactor "$TEMP_DIR/"
cp manage.py "$TEMP_DIR/"
cp requirements-eb.txt "$TEMP_DIR/"
cp Dockerfile "$TEMP_DIR/"

# Copy apps (excluding __pycache__ and migrations)
for app in custom_auth health onboarding taxes hr estimates invoices products customers dashboard integrations banking banking_integration notifications; do
    if [ -d "$app" ]; then
        mkdir -p "$TEMP_DIR/$app"
        find "$app" -name "*.py" -not -path "*/__pycache__/*" -not -path "*/migrations/*" -exec cp --parents {} "$TEMP_DIR/" \;
        # Copy migrations __init__.py files only
        if [ -d "$app/migrations" ]; then
            mkdir -p "$TEMP_DIR/$app/migrations"
            cp "$app/migrations/__init__.py" "$TEMP_DIR/$app/migrations/" 2>/dev/null || true
        fi
    fi
done

# Copy templates if they exist
if [ -d "templates" ]; then
    cp -r templates "$TEMP_DIR/"
fi

# Copy static files structure (not content)
mkdir -p "$TEMP_DIR/static"
mkdir -p "$TEMP_DIR/staticfiles"
mkdir -p "$TEMP_DIR/media"

# Copy deployment configuration
cp -r ../../.ebextensions "$TEMP_DIR/" 2>/dev/null || mkdir -p "$TEMP_DIR/.ebextensions"
cp -r ../../.platform "$TEMP_DIR/" 2>/dev/null || mkdir -p "$TEMP_DIR/.platform"

# Copy .ebignore and .dockerignore
cp .ebignore "$TEMP_DIR/" 2>/dev/null || true
cp .dockerignore "$TEMP_DIR/" 2>/dev/null || true

# Ensure proper .ebextensions config exists
if [ ! -f "$TEMP_DIR/.ebextensions/01_environment.config" ]; then
    mkdir -p "$TEMP_DIR/.ebextensions"
    cat > "$TEMP_DIR/.ebextensions/01_environment.config" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONUNBUFFERED: 1
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: nginx
  aws:ec2:instances:
    InstanceTypes: t3.small
  aws:autoscaling:updatepolicy:rollingupdate:
    RollingUpdateEnabled: true
    MaxBatchSize: 1
    MinInstancesInService: 1
  aws:elasticbeanstalk:command:
    DeploymentPolicy: Rolling
    BatchSizeType: Fixed
    BatchSize: 1
EOF
fi

# Create the zip file
cd "$TEMP_DIR"
echo "Creating deployment zip..."
zip -r "../$ZIP_FILE" . -q

cd ..

# Check zip file size
ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)
echo -e "${GREEN}✅ Created deployment package: $ZIP_FILE (Size: $ZIP_SIZE)${NC}"

# Upload to S3
echo -e "\n📤 Uploading to S3..."
S3_KEY="${APP_NAME}/${ZIP_FILE}"
aws s3 cp "$ZIP_FILE" "s3://${S3_BUCKET}/${S3_KEY}" --region "$REGION"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Upload failed!${NC}"
    rm -rf "$TEMP_DIR"
    rm -f "$ZIP_FILE"
    exit 1
fi

echo -e "${GREEN}✅ Upload successful!${NC}"

# Create application version
echo -e "\n📌 Creating application version..."
VERSION_LABEL="v-${TIMESTAMP}"
aws elasticbeanstalk create-application-version \
    --application-name "$APP_NAME" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" \
    --region "$REGION"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create application version!${NC}"
    rm -rf "$TEMP_DIR"
    rm -f "$ZIP_FILE"
    exit 1
fi

echo -e "${GREEN}✅ Application version created: $VERSION_LABEL${NC}"

# Deploy the new version
echo -e "\n🚀 Deploying to environment: ${YELLOW}$ENV_NAME${NC}"
aws elasticbeanstalk update-environment \
    --application-name "$APP_NAME" \
    --environment-name "$ENV_NAME" \
    --version-label "$VERSION_LABEL" \
    --region "$REGION"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment initiated!${NC}"
    
    # Show deployment URL
    echo -e "\n📊 Monitor deployment progress:"
    echo "https://console.aws.amazon.com/elasticbeanstalk/home?region=${REGION}#/environment/dashboard?applicationName=${APP_NAME}&environmentId=e-sa5kj3pqwf"
    
    echo -e "\n🌐 Application will be available at:"
    echo -e "${GREEN}http://DottApp-simple.eba-dua2f3pi.us-east-1.elasticbeanstalk.com${NC}"
else
    echo -e "${RED}❌ Failed to initiate deployment!${NC}"
    rm -rf "$TEMP_DIR"
    rm -f "$ZIP_FILE"
    exit 1
fi

# Clean up
rm -rf "$TEMP_DIR"
rm -f "$ZIP_FILE"

# Return to project root
cd ../..

echo -e "\n✨ Clean deployment completed!"
echo -e "\n💡 Check deployment status with:"
echo "aws elasticbeanstalk describe-environments --application-name $APP_NAME --environment-names $ENV_NAME --region $REGION"