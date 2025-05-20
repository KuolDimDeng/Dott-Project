#!/bin/bash

# complete_deployment.sh - All-in-one script for AWS EB Docker deployment
# This script:
# 1. Creates a minimal Docker deployment package
# 2. Creates a full application code package
# 3. Updates S3 references in the minimal package
# 4. Uploads both packages to S3
# 5. Deploys the minimal package to AWS Elastic Beanstalk

# Color codes for terminal output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set the timestamp and package names
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MINIMAL_PACKAGE_NAME="${TIMESTAMP}-minimal-eb-package.zip"
FULL_APP_CODE_NAME="full-app-code-${TIMESTAMP}.zip"
S3_BUCKET="dott-app-deployments-dockerebmanual001"

# Base directory
BASE_DIR="/Users/kuoldeng/projectx"
BACKEND_DIR="${BASE_DIR}/backend/pyfactor"

echo -e "${BLUE}======= COMPLETE DEPLOYMENT WORKFLOW ========${NC}"
echo -e "${BLUE}Step 1: Creating minimal Docker deployment package...${NC}"

# Create minimal package
cd "${BASE_DIR}" && "${BACKEND_DIR}/scripts/create_minimal_package.sh"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to create minimal package. Exiting.${NC}"
  exit 1
fi

# Get the actual minimal package name (most recent)
MINIMAL_PACKAGE=$(ls -t "${BACKEND_DIR}"/*-minimal-eb-package.zip | head -1)
MINIMAL_PACKAGE_NAME=$(basename "${MINIMAL_PACKAGE}")
echo -e "${GREEN}Using minimal package: ${MINIMAL_PACKAGE_NAME}${NC}"

echo -e "${BLUE}Step 2: Creating full application code package...${NC}"

# Create full app code package
cd "${BASE_DIR}" && "${BACKEND_DIR}/scripts/prepare_app_code_for_s3.sh"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to create full application code package. Exiting.${NC}"
  exit 1
fi

# Get the actual full app code package name (most recent)
FULL_APP_CODE=$(ls -t "${BACKEND_DIR}"/full-app-code-*.zip | head -1)
FULL_APP_CODE_NAME=$(basename "${FULL_APP_CODE}")
echo -e "${GREEN}Using application code package: ${FULL_APP_CODE_NAME}${NC}"

echo -e "${BLUE}Step 3: Updating S3 references in minimal package...${NC}"

# Update S3 reference in create_minimal_package.sh
cd "${BASE_DIR}" && node "${BACKEND_DIR}/scripts/Version0036_update_s3_reference.js" "${FULL_APP_CODE_NAME}"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to update S3 reference. Exiting.${NC}"
  exit 1
fi

echo -e "${BLUE}Step 4: Uploading packages to S3...${NC}"
echo -e "${YELLOW}Note: This step requires AWS CLI to be configured with proper credentials${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
  echo -e "${YELLOW}You can install AWS CLI with: 'pip install awscli' and configure with 'aws configure'${NC}"
  exit 1
fi

# Upload minimal package to S3
echo -e "${BLUE}Uploading minimal package to S3...${NC}"
aws s3 cp "${MINIMAL_PACKAGE}" "s3://${S3_BUCKET}/${MINIMAL_PACKAGE_NAME}"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to upload minimal package to S3. Exiting.${NC}"
  echo -e "${YELLOW}Please check your AWS credentials and S3 bucket permissions.${NC}"
  exit 1
fi

# Upload full app code to S3
echo -e "${BLUE}Uploading full application code to S3...${NC}"
aws s3 cp "${FULL_APP_CODE}" "s3://${S3_BUCKET}/${FULL_APP_CODE_NAME}"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to upload full application code to S3. Exiting.${NC}"
  echo -e "${YELLOW}Please check your AWS credentials and S3 bucket permissions.${NC}"
  exit 1
fi

echo -e "${BLUE}Step 5: Deploying to AWS Elastic Beanstalk...${NC}"
echo -e "${YELLOW}Note: This step requires EB CLI to be configured${NC}"

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
  echo -e "${RED}EB CLI is not installed. Please install it first.${NC}"
  echo -e "${YELLOW}You can install EB CLI with: 'pip install awsebcli'${NC}"
  exit 1
fi

# Update aws_cli_deploy.sh with the correct minimal package name
# Since we'll be using the S3 path for deployment
sed -i.bak "s/S3_KEY=.*/S3_KEY=\"${MINIMAL_PACKAGE_NAME}\"/g" "${BACKEND_DIR}/scripts/aws_cli_deploy.sh"

# Deploy using aws_cli_deploy.sh
echo -e "${BLUE}Deploying minimal package to AWS Elastic Beanstalk...${NC}"
cd "${BACKEND_DIR}" && "${BACKEND_DIR}/scripts/aws_cli_deploy.sh"
if [ $? -ne 0 ]; then
  echo -e "${RED}Deployment failed. Please check the error messages above.${NC}"
  exit 1
fi

echo -e "${GREEN}=========== DEPLOYMENT COMPLETE ===========${NC}"
echo -e "${GREEN}Minimal package: ${MINIMAL_PACKAGE_NAME} (1 MB)${NC}"
echo -e "${GREEN}Application code: ${FULL_APP_CODE_NAME} (90 MB)${NC}"
echo -e "${GREEN}The Dockerfile in the minimal package is configured to download${NC}"
echo -e "${GREEN}the full application code from S3 during container build.${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "${YELLOW}To check deployment status:${NC}"
echo -e "${YELLOW}cd ${BACKEND_DIR} && eb status${NC}"
echo -e "${YELLOW}To view deployment logs:${NC}"
echo -e "${YELLOW}cd ${BACKEND_DIR} && eb logs${NC}"
