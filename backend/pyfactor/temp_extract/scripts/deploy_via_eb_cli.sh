#!/bin/bash
# deploy_via_eb_cli.sh - Helper script for deploying via EB CLI
# Created by Version0033_fix_setuptools_uninstall.py fix
# Usage: ./scripts/deploy_via_eb_cli.sh

set -e  # Exit on error

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}======== EB CLI DEPLOYMENT SCRIPT ========${NC}"
echo -e "${BLUE}Starting deployment process at $(date)${NC}"

# Verify we're in the right directory
if [[ ! -d ".elasticbeanstalk" ]]; then
  echo -e "${RED}Error: This script must be run from the pyfactor directory${NC}"
  echo -e "${YELLOW}Please run: cd /Users/kuoldeng/projectx/backend/pyfactor${NC}"
  exit 1
fi

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
  echo -e "${RED}Error: EB CLI is not installed${NC}"
  echo -e "${YELLOW}Installing EB CLI now...${NC}"
  pip install awsebcli
  
  # Verify installation
  if ! command -v eb &> /dev/null; then
    echo -e "${RED}Failed to install EB CLI. Please install manually:${NC}"
    echo -e "${YELLOW}pip install awsebcli${NC}"
    exit 1
  fi
fi

# Verify AWS credentials are available
if ! aws sts get-caller-identity &> /dev/null; then
  echo -e "${RED}Error: AWS credentials not configured or expired${NC}"
  echo -e "${YELLOW}Please set up your AWS credentials:${NC}"
  echo -e "${YELLOW}aws configure${NC}"
  exit 1
fi

# Find the latest reduced package (preferred)
LATEST_PACKAGE=$(ls -t docker-eb-package-reduced-*.zip 2>/dev/null | head -1)

if [[ -z "$LATEST_PACKAGE" ]]; then
  echo -e "${YELLOW}No reduced package found${NC}"
  
  # Look for standard deployment package
  LATEST_PACKAGE=$(ls -t pyfactor-docker-deployment-*.zip 2>/dev/null | head -1)
  
  if [[ -z "$LATEST_PACKAGE" ]]; then
    echo -e "${RED}No deployment package found${NC}"
    echo -e "${YELLOW}Please run first:${NC}"
    echo -e "${YELLOW}./scripts/prepare_deployment.sh${NC}"
    exit 1
  fi
  
  # Check package size
  PACKAGE_SIZE_MB=$(du -m "$LATEST_PACKAGE" | cut -f1)
  if [ "$PACKAGE_SIZE_MB" -gt 500 ]; then
    echo -e "${RED}Warning: Package size (${PACKAGE_SIZE_MB} MB) exceeds 500MB limit!${NC}"
    echo -e "${YELLOW}Please run the package size reduction tool first:${NC}"
    echo -e "${YELLOW}./scripts/reduce_package_size.sh${NC}"
    echo -e "${RED}Proceeding with oversized package may cause deployment failure.${NC}"
    read -p "Do you want to continue anyway? (y/n): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
      echo -e "${YELLOW}Deployment canceled. Run reduce_package_size.sh first.${NC}"
      exit 1
    fi
  fi
  
  echo -e "${YELLOW}Using standard package: ${LATEST_PACKAGE}${NC}"
else
  echo -e "${GREEN}Using reduced package: ${LATEST_PACKAGE}${NC}"
fi

# Check EB environment status
echo -e "${BLUE}Checking environment status...${NC}"
if ! eb status &> /dev/null; then
  echo -e "${YELLOW}Environment doesn't exist yet or EB CLI not initialized for this app${NC}"
  
  # Check if we need to initialize the application
  echo -e "${BLUE}Initializing EB CLI configuration...${NC}"
  eb init --platform "Docker running on 64bit Amazon Linux 2023" --region us-east-1 Dott
  
  # Automatically create the environment if it doesn't exist
  echo -e "${BLUE}Creating new environment pyfactor-docker-env...${NC}"
  eb create pyfactor-docker-env \
    --elb-type application \
    --platform "Docker running on 64bit Amazon Linux 2023" \
    --instance-type t3.small \
    --keyname dott-key-pair \
    --timeout 20 \
    --envvars "DEBUG=False,DJANGO_SETTINGS_MODULE=pyfactor.settings_eb,DOMAIN=dottapps.com,EB_ENV_NAME=pyfactor-docker-env,PYTHONPATH=/var/app/current"
else
  echo -e "${GREEN}Environment already exists${NC}"
fi

# Deploy the application
echo -e "${BLUE}Deploying application with package: ${LATEST_PACKAGE}${NC}"
echo -e "${YELLOW}This may take several minutes...${NC}"

# Create version label based on date/time
VERSION_LABEL="v$(date '+%Y%m%d%H%M')"

# Get the size of the package for informational purposes only
PACKAGE_SIZE_MB=$(du -m "$LATEST_PACKAGE" | cut -f1)
echo -e "${BLUE}Package size: ${PACKAGE_SIZE_MB} MB${NC}"

# Due to EB CLI file size limitation issues, always use the S3 direct upload method
echo -e "${YELLOW}Using direct upload method with S3 bucket for reliable deployment...${NC}"

# Create the application version by uploading the package to S3
echo -e "${BLUE}Creating application version ${VERSION_LABEL}...${NC}"
echo -e "${BLUE}First, uploading package to S3...${NC}"

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
S3_BUCKET="elasticbeanstalk-us-east-1-${AWS_ACCOUNT_ID}"
S3_KEY="docker-eb-package-$VERSION_LABEL.zip"

# Upload to S3
echo -e "${BLUE}Uploading to s3://${S3_BUCKET}/${S3_KEY}...${NC}"
aws s3 cp "$LATEST_PACKAGE" "s3://${S3_BUCKET}/${S3_KEY}"

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to upload package to S3. Please check your AWS credentials.${NC}"
  exit 1
fi

# Create application version
echo -e "${BLUE}Creating Elastic Beanstalk application version...${NC}"
aws elasticbeanstalk create-application-version \
  --application-name "Dott" \
  --version-label "$VERSION_LABEL" \
  --source-bundle S3Bucket="${S3_BUCKET}",S3Key="${S3_KEY}"

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to create application version. Please check the AWS CLI output above.${NC}"
  exit 1
fi

echo -e "${GREEN}Application version created successfully!${NC}"

# Now deploy using the application version we just created
# First, check if the environment exists
if eb status pyfactor-docker-env &> /dev/null; then
  # Update existing environment
  echo -e "${BLUE}Updating existing environment...${NC}"
  eb deploy pyfactor-docker-env --version "$VERSION_LABEL" --timeout 20
else
  # Create new environment with the version
  echo -e "${BLUE}Creating new environment...${NC}"
  eb create pyfactor-docker-env \
    --elb-type application \
    --platform "Docker running on 64bit Amazon Linux 2023" \
    --instance-type t3.small \
    --keyname dott-key-pair \
    --timeout 20 \
    --envvars "DEBUG=False,DJANGO_SETTINGS_MODULE=pyfactor.settings_eb,DOMAIN=dottapps.com,EB_ENV_NAME=pyfactor-docker-env,PYTHONPATH=/var/app/current" \
    --version "$VERSION_LABEL"
fi

# Check deployment status
if [[ $? -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}Deployment initiated successfully!${NC}"
  echo -e "${BLUE}Checking environment health...${NC}"
  
  # Check environment health
  eb health
  
  echo -e "${GREEN}${BOLD}Deployment process completed at $(date)${NC}"
  echo -e "${BLUE}You can open the application with:${NC}"
  echo -e "${YELLOW}eb open${NC}"
  
  echo -e "${BLUE}If you need to view logs:${NC}"
  echo -e "${YELLOW}eb logs${NC}"
else
  echo -e "${RED}${BOLD}Deployment failed!${NC}"
  echo -e "${BLUE}Checking logs for errors...${NC}"
  
  # Show recent logs
  eb logs --all
  
  echo -e "${RED}Please check the logs above for errors${NC}"
  exit 1
fi

echo -e "${BLUE}${BOLD}======== DEPLOYMENT PROCESS COMPLETE ========${NC}"
