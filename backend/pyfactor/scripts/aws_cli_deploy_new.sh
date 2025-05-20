#!/bin/bash
# aws_cli_deploy_new.sh - Deploy directly to Elastic Beanstalk using AWS CLI
# This script bypasses the AWS Console UI and uses direct CLI commands
# Version: 1.2.1
# Updated: May 18, 2025

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration variables
APP_NAME="Dott"
ENV_NAME="Dott-env-3"  # Changed to a new environment name
VERSION_LABEL="V$(date '+%Y%m%d%H%M%S')" # Unique version label with timestamp
S3_BUCKET="dott-app-deployments-dockerebmanual001"
AWS_REGION="us-east-1" # Default to us-east-1, change if needed
PLATFORM_ARN="arn:aws:elasticbeanstalk:us-east-1::platform/Docker running on 64bit Amazon Linux 2023/4.5.1"
INSTANCE_TYPE="t2.medium" # From your configuration
EC2_KEY_PAIR="dott-key-pair" # From your configuration

echo -e "${BLUE}${BOLD}======= AWS CLI DEPLOYMENT ========${NC}"
echo -e "${YELLOW}Deploying application: ${APP_NAME}${NC}"
echo -e "${YELLOW}Environment: ${ENV_NAME}${NC}"
echo -e "${YELLOW}Version: ${VERSION_LABEL}${NC}"

# First create a fixed package without problematic configs
echo -e "${BLUE}Creating fixed deployment package...${NC}"
BACKEND_DIR="$(pwd)"
chmod +x scripts/create_fixed_package.sh
./scripts/create_fixed_package.sh

# Use the fixed package
LATEST_PACKAGE="$BACKEND_DIR/fixed-docker-eb-package-clean.zip"

if [ ! -f "$LATEST_PACKAGE" ]; then
    echo -e "${RED}Error: Package not found: ${LATEST_PACKAGE}${NC}"
    echo -e "${YELLOW}Please check if the file exists.${NC}"
    exit 1
fi

S3_KEY=$(basename "$LATEST_PACKAGE")
echo -e "${GREEN}Using package: ${LATEST_PACKAGE}${NC}"
echo -e "${GREEN}Package size: $(du -h "$LATEST_PACKAGE" | cut -f1)${NC}"
echo -e "${YELLOW}Will use S3 key: ${S3_KEY}${NC}"

# Step 1: Check if the application exists
echo -e "${BLUE}Checking if application exists...${NC}"
if ! aws elasticbeanstalk describe-applications --application-names "$APP_NAME" &>/dev/null; then
  echo -e "${YELLOW}Application does not exist. Creating application...${NC}"
  aws elasticbeanstalk create-application --application-name "$APP_NAME" --description "Docker application for Dott"
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create application. Check AWS CLI output above.${NC}"
    exit 1
  fi
  echo -e "${GREEN}Application created successfully!${NC}"
fi

# Step 2: Upload the package to S3
echo -e "${BLUE}Uploading package to S3...${NC}"
if ! aws s3 cp "$LATEST_PACKAGE" "s3://$S3_BUCKET/$S3_KEY"; then
  echo -e "${RED}Error: Failed to upload package to S3.${NC}"
  echo -e "${YELLOW}Please check that the S3 bucket exists and you have access.${NC}"
  exit 1
fi
echo -e "${GREEN}Package uploaded successfully!${NC}"

# Step 3: Create the application version with process=false to handle large files
echo -e "${BLUE}Creating application version from S3...${NC}"
echo -e "${YELLOW}NOTE: This script bypasses size limits by setting process=false${NC}"

aws elasticbeanstalk create-application-version \
  --application-name "$APP_NAME" \
  --version-label "$VERSION_LABEL" \
  --description "Docker deployment package" \
  --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" \
  --auto-create-application \
  --no-process

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to create application version.${NC}"
  echo -e "${YELLOW}This could be due to:${NC}"
  echo -e "${YELLOW}1. Package exceeding 512MB size limit (common with Docker packages)${NC}"
echo -e "${YELLOW}2. S3 bucket permissions issue${NC}"
echo -e "${YELLOW}3. Invalid application name${NC}"

  echo -e "\n${BLUE}Suggestion:${NC}"
  echo -e "${YELLOW}For large packages, try these alternatives:${NC}"
  echo -e "${YELLOW}1. Use the AWS Console to manually create the application version from S3${NC}"
  echo -e "${YELLOW}2. Reduce package size using our package reduction script:${NC}"
  echo -e "${YELLOW}   ./scripts/reduce_package_size.sh${NC}"
  exit 1
fi
echo -e "${GREEN}Application version created successfully!${NC}"

# Step 4: Create a new environment with Docker-specific configuration
echo -e "${BLUE}Creating new environment with Docker configuration...${NC}"
aws elasticbeanstalk create-environment \
  --application-name "$APP_NAME" \
  --environment-name "$ENV_NAME" \
  --platform-arn "$PLATFORM_ARN" \
  --version-label "$VERSION_LABEL" \
  --option-settings file://docker-options.json

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to create environment. Check AWS CLI output above.${NC}"
  exit 1
fi
echo -e "${GREEN}Environment creation initiated successfully!${NC}"

# Step 5: Wait for deployment to complete and show status
echo -e "${BLUE}Waiting for deployment to complete...${NC}"
echo -e "${YELLOW}This may take 5-10 minutes. Please be patient.${NC}"
echo -e "${YELLOW}You can check the status in the AWS Elastic Beanstalk console.${NC}"
echo -e "${YELLOW}URL: https://$ENV_NAME.$AWS_REGION.elasticbeanstalk.com${NC}"

# Poll for status every 30 seconds for up to 15 minutes
MAX_ATTEMPTS=30 # 15 minutes (30 attempts × 30 seconds)
attempts=0
success=false

while [ $attempts -lt $MAX_ATTEMPTS ]; do
  sleep 30
  status=$(aws elasticbeanstalk describe-environments --environment-names "$ENV_NAME" --query "Environments[0].Status" --output text)
  health=$(aws elasticbeanstalk describe-environments --environment-names "$ENV_NAME" --query "Environments[0].Health" --output text)

  echo -e "${BLUE}Current status: ${status}, Health: ${health}${NC}"

  if [ "$status" == "Ready" ]; then
    if [ "$health" == "Green" ] || [ "$health" == "Yellow" ]; then
      success=true
      break
    fi
  fi

  attempts=$((attempts+1))
done

if [ "$success" = true ]; then
  echo -e "${GREEN}${BOLD}======== DEPLOYMENT SUCCESSFUL ========${NC}"
  echo -e "${GREEN}Your application has been deployed successfully!${NC}"
  echo -e "${GREEN}Environment URL: https://$ENV_NAME.$AWS_REGION.elasticbeanstalk.com${NC}"
else
  echo -e "${YELLOW}${BOLD}======== DEPLOYMENT IN PROGRESS ========${NC}"
  echo -e "${YELLOW}Deployment is still in progress after waiting period.${NC}"
  echo -e "${YELLOW}You can check the status in the AWS Elastic Beanstalk console.${NC}"
  echo -e "${YELLOW}Environment URL: https://$ENV_NAME.$AWS_REGION.elasticbeanstalk.com${NC}"
fi

echo -e "${BLUE}${BOLD}======== DEPLOYMENT PROCESS COMPLETE ========${NC}"
echo -e "${BLUE}Check the AWS Elastic Beanstalk console for detailed status.${NC}"
