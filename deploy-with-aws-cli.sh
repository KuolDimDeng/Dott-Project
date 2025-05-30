#!/bin/bash

# Deploy to AWS Elastic Beanstalk using AWS CLI
# Alternative deployment method without EB CLI

set -e

echo "🚀 Starting deployment to AWS Elastic Beanstalk (AWS CLI method)..."
echo "======================================================="

# Configuration
APP_NAME="DottApp"
ENV_NAME="DottApp-simple"
REGION="us-east-1"
S3_BUCKET="elasticbeanstalk-${REGION}-471112661935"  # Your account's EB S3 bucket

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://aws.amazon.com/cli/"
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")/backend/pyfactor"

# Create deployment package
echo -e "\n📦 Creating deployment package..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ZIP_FILE="deploy-${TIMESTAMP}.zip"

# Clean up old deployment packages
rm -f deploy-*.zip

# Create the deployment package (excluding unnecessary files)
echo "Creating zip file..."
zip -r "$ZIP_FILE" . \
    -x "*.git/*" \
    -x "*__pycache__/*" \
    -x "*.pyc" \
    -x "*venv/*" \
    -x "*.env" \
    -x "*node_modules/*" \
    -x "*backups/*" \
    -x "*deployment_backups/*" \
    -x "*configuration_backups/*" \
    -x "*.log" \
    -x "*staticfiles/*" \
    -x "*.sqlite3" \
    -x "*media/*" \
    -x "deploy-*.zip"

echo -e "${GREEN}✅ Created deployment package: $ZIP_FILE${NC}"

# Upload to S3
echo -e "\n📤 Uploading to S3..."
S3_KEY="${APP_NAME}/${ZIP_FILE}"
aws s3 cp "$ZIP_FILE" "s3://${S3_BUCKET}/${S3_KEY}" --region "$REGION"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Upload successful!${NC}"
else
    echo -e "${RED}❌ Upload failed!${NC}"
    exit 1
fi

# Create application version
echo -e "\n📌 Creating application version..."
VERSION_LABEL="v-${TIMESTAMP}"
aws elasticbeanstalk create-application-version \
    --application-name "$APP_NAME" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" \
    --region "$REGION"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Application version created: $VERSION_LABEL${NC}"
else
    echo -e "${RED}❌ Failed to create application version!${NC}"
    exit 1
fi

# Deploy the new version
echo -e "\n🚀 Deploying to environment: ${YELLOW}$ENV_NAME${NC}"
echo "This may take several minutes..."

aws elasticbeanstalk update-environment \
    --application-name "$APP_NAME" \
    --environment-name "$ENV_NAME" \
    --version-label "$VERSION_LABEL" \
    --region "$REGION"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment initiated!${NC}"
else
    echo -e "${RED}❌ Failed to initiate deployment!${NC}"
    exit 1
fi

# Wait for deployment to complete
echo -e "\n⏳ Waiting for deployment to complete..."
echo "You can monitor progress in the AWS console:"
echo "https://console.aws.amazon.com/elasticbeanstalk/home?region=${REGION}#/environment/dashboard?applicationName=${APP_NAME}&environmentId=e-sa5kj3pqwf"

# Poll environment status
MAX_ATTEMPTS=60  # 10 minutes max wait
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    STATUS=$(aws elasticbeanstalk describe-environments \
        --application-name "$APP_NAME" \
        --environment-names "$ENV_NAME" \
        --region "$REGION" \
        --query 'Environments[0].Status' \
        --output text)
    
    HEALTH=$(aws elasticbeanstalk describe-environments \
        --application-name "$APP_NAME" \
        --environment-names "$ENV_NAME" \
        --region "$REGION" \
        --query 'Environments[0].Health' \
        --output text)
    
    echo -ne "\r🔄 Status: $STATUS | Health: $HEALTH (Attempt $((ATTEMPT+1))/$MAX_ATTEMPTS)    "
    
    if [ "$STATUS" = "Ready" ]; then
        echo -e "\n${GREEN}✅ Deployment completed!${NC}"
        break
    fi
    
    if [ "$STATUS" = "Terminated" ] || [ "$STATUS" = "Terminating" ]; then
        echo -e "\n${RED}❌ Environment terminated!${NC}"
        exit 1
    fi
    
    sleep 10
    ATTEMPT=$((ATTEMPT+1))
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "\n${YELLOW}⚠️  Deployment is taking longer than expected. Check AWS console for details.${NC}"
fi

# Get environment info
echo -e "\n📊 Environment details:"
aws elasticbeanstalk describe-environments \
    --application-name "$APP_NAME" \
    --environment-names "$ENV_NAME" \
    --region "$REGION" \
    --query 'Environments[0].{Status:Status,Health:Health,URL:EndpointURL,Version:VersionLabel}' \
    --output table

# Clean up local zip file
rm -f "$ZIP_FILE"

# Return to project root
cd ../..

echo -e "\n✨ Deployment script completed!"
echo -e "\n🌐 Application URL: ${GREEN}http://DottApp-simple.eba-dua2f3pi.us-east-1.elasticbeanstalk.com${NC}"
echo -e "📍 Health endpoint: ${GREEN}http://DottApp-simple.eba-dua2f3pi.us-east-1.elasticbeanstalk.com/health/${NC}"