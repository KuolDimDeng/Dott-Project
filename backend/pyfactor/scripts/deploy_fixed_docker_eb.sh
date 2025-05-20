#!/bin/bash
# deploy_fixed_docker_eb.sh
# 
# This script applies the AWS Elastic Beanstalk Docker deployment fixes
# and creates a deployment package.
#
# Created: 2025-05-18

set -e

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}====================================================${NC}"
echo -e "${YELLOW}AWS Elastic Beanstalk Docker Deployment Fix${NC}"
echo -e "${YELLOW}====================================================${NC}"

# Get directory paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$BACKEND_DIR")")"

echo -e "${YELLOW}Directories:${NC}"
echo "Script directory: $SCRIPT_DIR"
echo "Backend directory: $BACKEND_DIR"
echo "Project root: $PROJECT_ROOT"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js to run the fix script.${NC}"
    exit 1
fi

# Run the fix script
echo -e "${YELLOW}Running the Docker EB deployment fix script...${NC}"
node "$SCRIPT_DIR/Version0041_fix_eb_docker_build.js"

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Fix script failed. See above for errors.${NC}"
    exit 1
fi

echo -e "${GREEN}Fix script completed successfully.${NC}"
echo

# Create deployment package
echo -e "${YELLOW}Creating deployment package...${NC}"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
PACKAGE_NAME="pyfactor-docker-deployment-$TIMESTAMP.zip"
PACKAGE_PATH="$PROJECT_ROOT/$PACKAGE_NAME"

cd "$BACKEND_DIR"
zip -r "$PACKAGE_PATH" . -x "*.git*" "*.DS_Store" "*.pyc" "__pycache__/*"

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to create deployment package.${NC}"
    exit 1
fi

echo -e "${GREEN}Deployment package created successfully: $PACKAGE_PATH${NC}"
echo

# Provide deployment instructions
echo -e "${YELLOW}====================================================${NC}"
echo -e "${YELLOW}Deployment Instructions${NC}"
echo -e "${YELLOW}====================================================${NC}"
echo "1. Log in to the AWS Management Console"
echo "2. Navigate to Elastic Beanstalk"
echo "3. Select your environment (or create a new one)"
echo "4. Click 'Upload and Deploy'"
echo "5. Select the deployment package: $PACKAGE_NAME"
echo "6. Click 'Deploy'"
echo
echo -e "${YELLOW}Alternatively, use the AWS CLI:${NC}"
echo "aws elasticbeanstalk create-application-version \\"
echo "  --application-name YOUR_APPLICATION_NAME \\"
echo "  --version-label v1-$TIMESTAMP \\"
echo "  --source-bundle S3Bucket=\"YOUR_S3_BUCKET\",S3Key=\"$PACKAGE_NAME\""
echo
echo "aws elasticbeanstalk update-environment \\"
echo "  --environment-name YOUR_ENVIRONMENT_NAME \\"
echo "  --version-label v1-$TIMESTAMP"
echo
echo -e "${YELLOW}For more details, refer to:${NC}"
echo "- $BACKEND_DIR/DOCKER_EB_FIXED_DEPLOYMENT_README.md"
echo "- $BACKEND_DIR/DOCKER_EB_DEPLOYMENT_ERRORS_FIXED.md"
echo
echo -e "${GREEN}Deployment package preparation complete!${NC}"
