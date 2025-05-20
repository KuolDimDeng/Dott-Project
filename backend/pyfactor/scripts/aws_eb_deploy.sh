#!/bin/bash
# aws_eb_deploy.sh
# 
# This script deploys a Docker application to AWS Elastic Beanstalk using AWS CLI
# It handles the process of:
# 1. Uploading the deployment package to S3
# 2. Creating an Elastic Beanstalk application version
# 3. Deploying the version to an environment
#
# Created: 2025-05-18

set -e

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEFAULT_PACKAGE="pyfactor-docker-deployment-20250518190837.zip"
PACKAGE_PATH=""
APP_NAME=""
ENV_NAME=""
S3_BUCKET=""
S3_PREFIX="eb-deployments"
VERSION_LABEL=""

# Function to show usage
show_usage() {
  echo -e "${YELLOW}Usage:${NC}"
  echo -e "  $0 [options]"
  echo
  echo -e "${YELLOW}Options:${NC}"
  echo -e "  -p, --package PATH      Path to deployment package (default: $DEFAULT_PACKAGE)"
  echo -e "  -a, --app-name NAME     Elastic Beanstalk application name (required)"
  echo -e "  -e, --env-name NAME     Elastic Beanstalk environment name (required)"
  echo -e "  -b, --s3-bucket NAME    S3 bucket name for staging (required)"
  echo -e "  -s, --s3-prefix PREFIX  S3 key prefix (default: $S3_PREFIX)"
  echo -e "  -v, --version LABEL     Version label (default: v1-TIMESTAMP)"
  echo -e "  -h, --help              Show this help"
  echo
  echo -e "${YELLOW}Example:${NC}"
  echo -e "  $0 --app-name pyfactor-app --env-name pyfactor-env-prod --s3-bucket my-deployments"
  exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -p|--package)
      PACKAGE_PATH="$2"
      shift 2
      ;;
    -a|--app-name)
      APP_NAME="$2"
      shift 2
      ;;
    -e|--env-name)
      ENV_NAME="$2"
      shift 2
      ;;
    -b|--s3-bucket)
      S3_BUCKET="$2"
      shift 2
      ;;
    -s|--s3-prefix)
      S3_PREFIX="$2"
      shift 2
      ;;
    -v|--version)
      VERSION_LABEL="$2"
      shift 2
      ;;
    -h|--help)
      show_usage
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      show_usage
      ;;
  esac
done

# Validate required parameters
if [ -z "$APP_NAME" ] || [ -z "$ENV_NAME" ] || [ -z "$S3_BUCKET" ]; then
  echo -e "${RED}Error: Required parameters missing.${NC}"
  show_usage
fi

# Set default package path if not specified
if [ -z "$PACKAGE_PATH" ]; then
  PACKAGE_PATH="/Users/kuoldeng/projectx/$DEFAULT_PACKAGE"
  echo -e "${YELLOW}Using default package: $PACKAGE_PATH${NC}"
fi

# Verify the package exists
if [ ! -f "$PACKAGE_PATH" ]; then
  echo -e "${RED}Error: Package file not found: $PACKAGE_PATH${NC}"
  exit 1
fi

# Get package file name
PACKAGE_NAME=$(basename "$PACKAGE_PATH")

# Generate version label if not specified
if [ -z "$VERSION_LABEL" ]; then
  TIMESTAMP=$(date +%Y%m%d%H%M%S)
  VERSION_LABEL="v1-$TIMESTAMP"
fi

# S3 key for the deployment package
S3_KEY="$S3_PREFIX/$PACKAGE_NAME"

echo -e "${YELLOW}====================================================${NC}"
echo -e "${YELLOW}AWS Elastic Beanstalk Deployment${NC}"
echo -e "${YELLOW}====================================================${NC}"
echo -e "${BLUE}Application:${NC} $APP_NAME"
echo -e "${BLUE}Environment:${NC} $ENV_NAME"
echo -e "${BLUE}Package:${NC} $PACKAGE_NAME $(du -h "$PACKAGE_PATH" | cut -f1)"
echo -e "${BLUE}S3 Bucket:${NC} $S3_BUCKET"
echo -e "${BLUE}S3 Key:${NC} $S3_KEY"
echo -e "${BLUE}Version:${NC} $VERSION_LABEL"
echo

# Step 1: Upload package to S3
echo -e "${YELLOW}Step 1:${NC} Uploading package to S3..."
aws s3 cp "$PACKAGE_PATH" "s3://$S3_BUCKET/$S3_KEY" --quiet

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Failed to upload package to S3.${NC}"
  echo -e "${YELLOW}Tip:${NC} Check if the S3 bucket exists and you have sufficient permissions."
  exit 1
fi

echo -e "${GREEN}Upload successful.${NC}"
echo

# Step 2: Create application version
echo -e "${YELLOW}Step 2:${NC} Creating Elastic Beanstalk application version..."
aws elasticbeanstalk create-application-version \
  --application-name "$APP_NAME" \
  --version-label "$VERSION_LABEL" \
  --description "Deployment created on $(date)" \
  --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" \
  --auto-create-application

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Failed to create application version.${NC}"
  exit 1
fi

echo -e "${GREEN}Application version created successfully.${NC}"
echo

# Step 3: Update environment with new version
echo -e "${YELLOW}Step 3:${NC} Deploying to Elastic Beanstalk environment..."
aws elasticbeanstalk update-environment \
  --environment-name "$ENV_NAME" \
  --version-label "$VERSION_LABEL"

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Failed to update environment.${NC}"
  exit 1
fi

echo -e "${GREEN}Deployment initiated successfully!${NC}"
echo

# Step 4: Monitor deployment status
echo -e "${YELLOW}Step 4:${NC} Monitoring deployment status..."
echo -e "${BLUE}Checking environment status every 10 seconds. Press Ctrl+C to stop monitoring.${NC}"
echo

while true; do
  ENV_STATUS=$(aws elasticbeanstalk describe-environments \
    --environment-names "$ENV_NAME" \
    --query "Environments[0].{Status:Status,Health:Health,Version:VersionLabel}" \
    --output json)
  
  STATUS=$(echo $ENV_STATUS | jq -r '.Status')
  HEALTH=$(echo $ENV_STATUS | jq -r '.Health')
  CURRENT_VERSION=$(echo $ENV_STATUS | jq -r '.Version')
  
  echo -e "Status: $STATUS | Health: $HEALTH | Version: $CURRENT_VERSION"
  
  if [[ "$STATUS" == "Ready" && "$CURRENT_VERSION" == "$VERSION_LABEL" ]]; then
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    break
  fi
  
  sleep 10
done

echo
echo -e "${YELLOW}====================================================${NC}"
echo -e "${GREEN}Deployment completed!${NC}"
echo -e "${YELLOW}====================================================${NC}"
echo -e "Your application is now available at:"
ENV_URL=$(aws elasticbeanstalk describe-environments \
  --environment-names "$ENV_NAME" \
  --query "Environments[0].CNAME" \
  --output text)
echo -e "${BLUE}http://$ENV_URL${NC}"
echo
echo -e "${YELLOW}To monitor the environment:${NC}"
echo -e "  AWS Console: https://console.aws.amazon.com/elasticbeanstalk/home"
echo -e "  Command Line: ./aws_eb_logs.sh --env-name $ENV_NAME"
echo
echo -e "${YELLOW}====================================================${NC}"
