#!/bin/bash
# prepare_for_manual_upload.sh - Prepares a package for manual upload to AWS Console
# This script ensures proper naming and placement of the package for manual upload
# without actually performing the upload

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}======== PREPARE FOR MANUAL UPLOAD ========${NC}"

# Check if pyfactor-docker-deployment.zip exists
if [ ! -f "pyfactor-docker-deployment.zip" ]; then
  # Check if there's a timestamped version
  LATEST_PACKAGE=$(ls -t pyfactor-docker-deployment-*.zip 2>/dev/null | head -1)
  
  if [ -z "$LATEST_PACKAGE" ]; then
    echo -e "${RED}No deployment package found!${NC}"
    echo -e "${YELLOW}Please run first:${NC}"
    echo -e "${YELLOW}./backend/pyfactor/scripts/prepare_deployment.sh${NC}"
    exit 1
  else
    echo -e "${YELLOW}Found timestamped package: ${LATEST_PACKAGE}${NC}"
    PACKAGE_PATH="$LATEST_PACKAGE"
  fi
else
  echo -e "${GREEN}Found standard package: pyfactor-docker-deployment.zip${NC}"
  PACKAGE_PATH="pyfactor-docker-deployment.zip"
fi

# Get size information
SIZE_MB=$(du -m "$PACKAGE_PATH" | cut -f1)
# Get bytes using ls -l instead of du -b for better cross-platform compatibility
SIZE_BYTES=$(ls -l "$PACKAGE_PATH" | awk '{print $5}')
echo -e "${BLUE}Package size: ${SIZE_MB} MB (${SIZE_BYTES} bytes)${NC}"

if [ "$SIZE_MB" -gt 500 ]; then
  echo -e "${YELLOW}Warning: Package exceeds AWS EB's 500MB limit (${SIZE_MB} MB)${NC}"
  echo -e "${YELLOW}You will need to use manual upload via AWS Console${NC}"
else
  echo -e "${GREEN}Package size is under 500MB limit. You can use EB CLI if preferred.${NC}"
fi

# Create a copy with today's date for better versioning in AWS Console
TIMESTAMP=$(date '+%Y%m%d%H%M%S')
CONSOLE_READY_NAME="docker-eb-manual-${TIMESTAMP}.zip"

# Create copy in the backend/pyfactor directory for easy access
mkdir -p backend/pyfactor
echo -e "${BLUE}Creating console-ready copy: ${CONSOLE_READY_NAME}${NC}"
cp "$PACKAGE_PATH" "backend/pyfactor/$CONSOLE_READY_NAME"

# Verify the copy was created
if [ -f "backend/pyfactor/$CONSOLE_READY_NAME" ]; then
  echo -e "${GREEN}Successfully created console-ready package:${NC}"
  echo -e "${GREEN}$(pwd)/backend/pyfactor/${CONSOLE_READY_NAME}${NC}"
else
  echo -e "${RED}Failed to create console-ready package${NC}"
  exit 1
fi

echo -e "${BLUE}${BOLD}======== NEXT STEPS ========${NC}"
echo -e "${YELLOW}1. Sign in to AWS Console${NC}"
echo -e "${YELLOW}2. Upload ${CONSOLE_READY_NAME} to S3${NC}"
echo -e "${YELLOW}3. Create an application version in Elastic Beanstalk using the S3 URL${NC}"
echo -e "${YELLOW}4. Deploy the version to your environment${NC}"
echo -e "${BLUE}See detailed instructions in:${NC}"
echo -e "${GREEN}backend/pyfactor/AWS_CONSOLE_MANUAL_UPLOAD_GUIDE.md${NC}"

echo -e "${BLUE}${BOLD}======== PREPARATION COMPLETE ========${NC}"
