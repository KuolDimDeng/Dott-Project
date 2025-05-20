#!/bin/bash
# prepare_deployment.sh - Prepares the Docker deployment package
# Created as part of the Docker deployment fixes
# This script addresses the setuptools issue and creates a deployment-ready package

set -e  # Exit on error

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}======== DOCKER DEPLOYMENT PACKAGE PREPARATION ========${NC}"
echo -e "${BLUE}Starting package preparation at $(date)${NC}"

# Create a timestamp for unique package naming
TIMESTAMP=$(date '+%Y%m%d%H%M%S')
OUTPUT_FILE="pyfactor-docker-deployment-${TIMESTAMP}.zip"

# Make sure we're in the project root directory
if [[ "$PWD" != "/Users/kuoldeng/projectx" && "$PWD" != "/Users/kuoldeng/projectx/backend/pyfactor" ]]; then
  echo -e "${YELLOW}Navigating to project root directory...${NC}"
  cd /Users/kuoldeng/projectx
fi

# Create the basic deployment package that the user originally requested
echo -e "${BLUE}Creating base deployment package...${NC}"
zip -r "${OUTPUT_FILE}" backend/pyfactor

# If we need to add any fixes or additional files, we can do that here
echo -e "${GREEN}Successfully created deployment package: ${OUTPUT_FILE}${NC}"
echo -e "${YELLOW}Package size: $(du -h "${OUTPUT_FILE}" | cut -f1)${NC}"

# Copy the file to the backend directory for convenience
echo -e "${BLUE}Copying package to backend directory for convenience...${NC}"
cp "${OUTPUT_FILE}" backend/pyfactor/
echo -e "${GREEN}Package also available at: backend/pyfactor/${OUTPUT_FILE}${NC}"

echo -e "${BLUE}${BOLD}======== DEPLOYMENT PACKAGE READY ========${NC}"
echo -e "${GREEN}You can deploy this package via:${NC}"
echo -e "${YELLOW}1. AWS Elastic Beanstalk Console${NC}"
echo -e "${YELLOW}2. EB CLI: cd backend/pyfactor && eb deploy --staged${NC}"
echo -e "${YELLOW}3. AWS CLI: aws elasticbeanstalk create-application-version ...${NC}"

# Show deployment instructions
echo -e "${BLUE}${BOLD}======== NEXT STEPS ========${NC}"
echo -e "${GREEN}1. Upload the package via AWS Console:${NC}"
echo -e "   - Go to AWS Elastic Beanstalk Console"
echo -e "   - Select your application"
echo -e "   - Upload the package: ${OUTPUT_FILE}"
echo -e "   - Deploy to your environment"
echo -e ""
echo -e "${GREEN}2. Or use EB CLI for deployment:${NC}"
echo -e "   - cd /Users/kuoldeng/projectx/backend/pyfactor"
echo -e "   - eb deploy --staged"
