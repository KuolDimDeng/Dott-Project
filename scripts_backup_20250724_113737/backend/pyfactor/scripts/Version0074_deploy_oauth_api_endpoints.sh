#!/bin/bash

# Version0074_deploy_oauth_api_endpoints.sh
# Version: 1.0.0
# Date: 2025-05-29
# Author: AI Assistant
# Purpose: Deploy OAuth API endpoints to existing Dott-env-fixed environment

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DEPLOYING OAUTH API ENDPOINTS TO ELASTIC BEANSTALK =====${NC}"
echo -e "${YELLOW}This script deploys the new OAuth API endpoints to Dott-env-fixed${NC}"

# Configuration based on the existing environment
APPLICATION_NAME="Dott"
ENVIRONMENT_NAME="Dott-env-fixed"
VERSION_LABEL="OAuth-API-V$(date +%Y%m%d%H%M%S)"
S3_BUCKET="dott-app-deployments-dockerebmanual001"
SOLUTION_STACK="64bit Amazon Linux 2023 v4.5.2 running Docker"

echo -e "${GREEN}Target Environment: $ENVIRONMENT_NAME${NC}"
echo -e "${GREEN}Target Domain: Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com${NC}"

# Check AWS CLI installation
echo -e "${YELLOW}Checking AWS CLI installation...${NC}"
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ AWS CLI found at: $(which aws)${NC}"
echo -e "${BLUE}Using AWS CLI: $(aws --version)${NC}"

# Create OAuth deployment package
OAUTH_PACKAGE="oauth-api-endpoints-$(date +%Y%m%d%H%M%S).zip"

echo -e "${YELLOW}Creating OAuth API deployment package...${NC}"

# Create temporary directory for the package
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}Using temporary directory: $TEMP_DIR${NC}"

# Copy all Django files
echo -e "${YELLOW}Copying Django application files...${NC}"
cp -r . "$TEMP_DIR/"

# Remove unnecessary files from the package
echo -e "${YELLOW}Cleaning up package...${NC}"
cd "$TEMP_DIR"

# Remove development and backup files
rm -rf scripts/
rm -rf .git/
rm -rf __pycache__/
rm -rf .pytest_cache/
rm -rf *.pyc
rm -rf .env
rm -rf venv/
rm -rf .venv/
rm -rf node_modules/
rm -rf *.log
rm -rf temp_extract*/
rm -rf fixed_package/
rm -rf *.zip

# Ensure the OAuth API files are included
echo -e "${GREEN}OAuth API files included:${NC}"
echo -e "${BLUE}✓ custom_auth/api/views/auth_views.py${NC}"
echo -e "${BLUE}✓ custom_auth/api/urls.py${NC}"

# Create the deployment package
echo -e "${YELLOW}Creating deployment package...${NC}"
zip -r "$OAUTH_PACKAGE" . -x "*.git*" "*.pyc" "__pycache__/*" "*.log" > /dev/null

# Move package back to original directory
mv "$OAUTH_PACKAGE" "/Users/kuoldeng/projectx/backend/pyfactor/"
cd "/Users/kuoldeng/projectx/backend/pyfactor/"

# Cleanup temporary directory
rm -rf "$TEMP_DIR"

# Get package size
PACKAGE_SIZE=$(du -h "$OAUTH_PACKAGE" | cut -f1)
echo -e "${GREEN}Created package: $OAUTH_PACKAGE ($PACKAGE_SIZE)${NC}"

# Generate S3 key for the package
S3_KEY="oauth-api-${OAUTH_PACKAGE}"

# Upload package to S3
echo -e "${YELLOW}Uploading OAuth package to S3...${NC}"
aws s3 cp "$OAUTH_PACKAGE" "s3://$S3_BUCKET/$S3_KEY" --quiet

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to upload package to S3. Check your AWS credentials and S3 bucket.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Package uploaded successfully!${NC}"

# Create application version
echo -e "${YELLOW}Creating application version from S3...${NC}"

aws elasticbeanstalk create-application-version \
    --application-name "$APPLICATION_NAME" \
    --version-label "$VERSION_LABEL" \
    --description "OAuth API endpoints deployment - SignUpView, UserProfileView, auth endpoints" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" \
    --no-process

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create application version. Check if the application exists.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Application version created successfully!${NC}"

# Update the existing environment
echo -e "${YELLOW}Updating Dott-env-fixed environment with OAuth API endpoints...${NC}"
echo -e "${BLUE}This will add the new OAuth endpoints:${NC}"
echo -e "${BLUE}  - /api/auth/signup/ (POST)${NC}"
echo -e "${BLUE}  - /api/auth/profile/ (GET/PATCH)${NC}"
echo -e "${BLUE}  - /api/auth/verify-session/ (GET)${NC}"
echo -e "${BLUE}  - /api/auth/check-attributes/ (POST)${NC}"
echo -e "${BLUE}  - /api/auth/verify-tenant/ (POST)${NC}"

aws elasticbeanstalk update-environment \
    --environment-name "$ENVIRONMENT_NAME" \
    --version-label "$VERSION_LABEL"

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to update environment.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment update initiated successfully!${NC}"

# Wait for deployment to complete
echo -e "${YELLOW}Waiting for OAuth API deployment to complete...${NC}"
echo -e "${BLUE}This may take 3-5 minutes. Please be patient.${NC}"
echo -e "${BLUE}The OAuth endpoints will be available after deployment.${NC}"

# Poll the environment status
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT+1))
    
    # Get environment status
    ENV_STATUS=$(aws elasticbeanstalk describe-environments --environment-names "$ENVIRONMENT_NAME" --query "Environments[0].Status" --output text 2>/dev/null)
    ENV_HEALTH=$(aws elasticbeanstalk describe-environments --environment-names "$ENVIRONMENT_NAME" --query "Environments[0].Health" --output text 2>/dev/null)
    
    echo -e "${BLUE}[$ATTEMPT/$MAX_ATTEMPTS] Status: $ENV_STATUS, Health: $ENV_HEALTH${NC}"
    
    # Check if deployment is complete
    if [[ "$ENV_STATUS" == "Ready" ]]; then
        break
    fi
    
    # Wait and try again
    sleep 10
done

# Check if we timed out
if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    echo -e "${YELLOW}======== DEPLOYMENT IN PROGRESS ========${NC}"
    echo -e "${YELLOW}The deployment is still in progress. Check the AWS Console for updates.${NC}"
    echo -e "${YELLOW}OAuth endpoints will be available once deployment completes.${NC}"
    echo -e "${YELLOW}=========================================${NC}"
else
    # Get the final status
    ENV_STATUS=$(aws elasticbeanstalk describe-environments --environment-names "$ENVIRONMENT_NAME" --query "Environments[0].Status" --output text 2>/dev/null)
    ENV_HEALTH=$(aws elasticbeanstalk describe-environments --environment-names "$ENVIRONMENT_NAME" --query "Environments[0].Health" --output text 2>/dev/null)
    
    # Show deployment summary
    echo -e "${GREEN}======== OAUTH API DEPLOYMENT COMPLETE ========${NC}"
    echo -e "${GREEN}Application: $APPLICATION_NAME${NC}"
    echo -e "${GREEN}Environment: $ENVIRONMENT_NAME${NC}"
    echo -e "${GREEN}Status: $ENV_STATUS${NC}"
    echo -e "${GREEN}Health: $ENV_HEALTH${NC}"
    echo -e "${GREEN}Version: $VERSION_LABEL${NC}"
    echo -e "${GREEN}Domain: Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com${NC}"
    echo -e "${GREEN}===============================================${NC}"
    
    echo -e "${BLUE}OAuth API Endpoints Now Available:${NC}"
    echo -e "${GREEN}✓ POST https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/api/auth/signup/${NC}"
    echo -e "${GREEN}✓ GET  https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/api/auth/profile/${NC}"
    echo -e "${GREEN}✓ GET  https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/api/auth/verify-session/${NC}"
    echo -e "${GREEN}✓ POST https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/api/auth/check-attributes/${NC}"
    echo -e "${GREEN}✓ POST https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/api/auth/verify-tenant/${NC}"
    
    echo -e "${YELLOW}The Google OAuth onboarding flow should now work correctly!${NC}"
fi

# Cleanup
echo -e "${YELLOW}Cleaning up deployment package...${NC}"
rm -f "$OAUTH_PACKAGE"
echo -e "${GREEN}✓ Cleanup complete${NC}"
