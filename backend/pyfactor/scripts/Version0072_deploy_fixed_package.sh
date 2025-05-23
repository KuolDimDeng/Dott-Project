#!/bin/bash

# Version0072_deploy_fixed_package.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Deploy the fixed EB package with proper Django configuration

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== AWS CLI DEPLOYMENT: DOTT APPS WITH FIXED DJANGO CONFIG =====${NC}"
echo -e "${YELLOW}This script deploys the fixed Django configuration package to Elastic Beanstalk${NC}"

# Configuration 
APPLICATION_NAME="DottApps"
ENVIRONMENT_NAME="DottApps-env"
VERSION_LABEL="V$(date +%Y%m%d%H%M%S)"
INSTANCE_TYPE="t2.small"
FIXED_PACKAGE="django-final-allowed-hosts-fix-20250522132254.zip"
S3_BUCKET="dott-app-deployments-dockerebmanual001"
SOLUTION_STACK="64bit Amazon Linux 2023 v4.5.2 running Docker"

# Check if the fixed package exists
if [ ! -f "$FIXED_PACKAGE" ]; then
    echo -e "${RED}Error: Fixed package $FIXED_PACKAGE not found${NC}"
    echo -e "${YELLOW}Run Version0071_fix_django_config.sh first to create the package${NC}"
    exit 1
fi

# Check AWS CLI installation
echo -e "${YELLOW}Checking AWS CLI installation...${NC}"
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ AWS CLI found at: $(which aws)${NC}"
echo -e "${BLUE}Using AWS CLI: $(aws --version)${NC}"

# Detect system architecture
echo -e "${YELLOW}Checking system architecture: $(uname -m)${NC}"
if [[ "$(uname -m)" == "arm64" ]]; then
    echo -e "${BLUE}Apple Silicon (M1/M2/M3/M4) detected.${NC}"
fi

# Get package size
PACKAGE_SIZE=$(du -h "$FIXED_PACKAGE" | cut -f1)
echo -e "${GREEN}Using fixed package: $FIXED_PACKAGE ($PACKAGE_SIZE)${NC}"

# Generate S3 key for the package
# Use lowercase application name without bash-specific syntax
APP_NAME_LOWER="dottapps"  # Manually set lowercase version of APPLICATION_NAME
S3_KEY="${APP_NAME_LOWER}-fixed-django-${FIXED_PACKAGE}"

# Upload package to S3
echo -e "${YELLOW}Uploading package to S3...${NC}"
aws s3 cp "$FIXED_PACKAGE" "s3://$S3_BUCKET/$S3_KEY" --quiet

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to upload package to S3. Check your AWS credentials and S3 bucket.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Package uploaded successfully!${NC}"

# Create application version
echo -e "${YELLOW}Creating application version from S3...${NC}"
echo -e "${BLUE}NOTE: This script bypasses size limits by setting process=false${NC}"

aws elasticbeanstalk create-application-version \
    --application-name "$APPLICATION_NAME" \
    --version-label "$VERSION_LABEL" \
    --description "DottApps deployment package with fixed Django config" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" \
    --no-process

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create application version. Check if the application exists.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Application version created successfully!${NC}"

# Check if environment exists
echo -e "${YELLOW}Checking if environment exists...${NC}"
ENV_EXISTS=$(aws elasticbeanstalk describe-environments --environment-names "$ENVIRONMENT_NAME" --query "Environments[0].Status" --output text 2>/dev/null)

if [[ "$ENV_EXISTS" == "Ready" || "$ENV_EXISTS" == "Updating" || "$ENV_EXISTS" == "Launching" ]]; then
    echo -e "${BLUE}Environment exists. Updating environment...${NC}"
    
    # Update existing environment
    aws elasticbeanstalk update-environment \
        --environment-name "$ENVIRONMENT_NAME" \
        --version-label "$VERSION_LABEL" \
        --solution-stack-name "$SOLUTION_STACK"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to update environment.${NC}"
        exit 1
    fi
else
    echo -e "${BLUE}Environment does not exist. Creating new environment...${NC}"
    
    # Create new environment
    aws elasticbeanstalk create-environment \
        --application-name "$APPLICATION_NAME" \
        --environment-name "$ENVIRONMENT_NAME" \
        --version-label "$VERSION_LABEL" \
        --solution-stack-name "$SOLUTION_STACK" \
        --option-settings file://DottAppsConfig.json
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create environment.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Environment creation/update initiated successfully!${NC}"

# Wait for deployment to complete
echo -e "${YELLOW}Waiting for deployment to complete...${NC}"
echo -e "${BLUE}This may take 5-10 minutes. Please be patient.${NC}"
echo -e "${BLUE}You can check the status in the AWS Elastic Beanstalk console.${NC}"
echo -e "${BLUE}URL: https://$ENVIRONMENT_NAME.us-east-1.elasticbeanstalk.com${NC}"

# Poll the environment status
MAX_ATTEMPTS=60
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT+1))
    
    # Get environment status
    ENV_STATUS=$(aws elasticbeanstalk describe-environments --environment-names "$ENVIRONMENT_NAME" --query "Environments[0].Status" --output text 2>/dev/null)
    ENV_HEALTH=$(aws elasticbeanstalk describe-environments --environment-names "$ENVIRONMENT_NAME" --query "Environments[0].Health" --output text 2>/dev/null)
    
    echo -e "${BLUE}Current status: $ENV_STATUS, Health: $ENV_HEALTH${NC}"
    
    # Check if deployment is complete
    if [[ "$ENV_STATUS" == "Ready" ]]; then
        break
    fi
    
    # Wait and try again
    sleep 10
done

# Check if we timed out
if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    echo -e "${RED}======== DEPLOYMENT INCOMPLETE ========${NC}"
    echo -e "${RED}The deployment did not complete successfully within the expected time.${NC}"
    echo -e "${RED}Check the AWS Elastic Beanstalk console for more information.${NC}"
    echo -e "${RED}==========================================${NC}"
    exit 1
fi

# Get the environment URL
ENV_URL=$(aws elasticbeanstalk describe-environments --environment-names "$ENVIRONMENT_NAME" --query "Environments[0].CNAME" --output text 2>/dev/null)

# Show deployment summary
echo -e "${GREEN}======== DEPLOYMENT COMPLETE ========${NC}"
echo -e "${GREEN}Application: $APPLICATION_NAME${NC}"
echo -e "${GREEN}Environment: $ENVIRONMENT_NAME${NC}"
echo -e "${GREEN}Status: $ENV_STATUS${NC}"
echo -e "${GREEN}Health: $ENV_HEALTH${NC}"
echo -e "${GREEN}Version: $VERSION_LABEL${NC}"
echo -e "${GREEN}URL: https://$ENV_URL${NC}"
echo -e "${GREEN}Package: $FIXED_PACKAGE${NC}"
echo -e "${GREEN}=====================================${NC}"

echo -e "${YELLOW}Note: It may take a few more minutes for the application to fully initialize.${NC}"
echo -e "${YELLOW}If the health status is not 'Green', check the logs in the AWS Elastic Beanstalk console.${NC}"
