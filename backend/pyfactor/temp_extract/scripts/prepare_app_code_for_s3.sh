#!/bin/bash
# prepare_app_code_for_s3.sh - Prepares the application code for S3 upload
# This script creates a zip of the full application code to be downloaded by the minimal deployment package

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}======= PREPARING APPLICATION CODE FOR S3 =======${NC}"

# Configuration
TIMESTAMP=$(date '+%Y%m%d%H%M%S')
OUTPUT_FILE="full-app-code-$TIMESTAMP.zip"
S3_BUCKET="dott-app-deployments-dockerebmanual001"
APP_DIR="/Users/kuoldeng/projectx/backend/pyfactor"

# Create a temporary directory
TEMP_DIR=$(mktemp -d)

echo -e "${BLUE}Creating application code package...${NC}"

# Copy the application code to temp dir
cd "$APP_DIR"
cp -R . "$TEMP_DIR/" 2>/dev/null

# Remove unnecessary files to keep the package smaller
cd "$TEMP_DIR"
rm -rf .git .ebextensions .elasticbeanstalk .platform *.zip node_modules __pycache__ *.pyc

# Create a file with build information
echo "Build timestamp: $TIMESTAMP" > "$TEMP_DIR/build_info.txt"
echo "Created by prepare_app_code_for_s3.sh" >> "$TEMP_DIR/build_info.txt"

# Create the zip file in the current directory
cd "$TEMP_DIR"
echo -e "${BLUE}Creating zip file...${NC}"
zip -rq "$APP_DIR/$OUTPUT_FILE" .
cd - > /dev/null

# Check if the zip was created successfully
if [ ! -f "$APP_DIR/$OUTPUT_FILE" ]; then
  echo -e "${RED}Failed to create application code package.${NC}"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Get the size of the package
SIZE_MB=$(du -m "$APP_DIR/$OUTPUT_FILE" | cut -f1)
echo -e "${GREEN}Created application code package: $OUTPUT_FILE (${SIZE_MB} MB)${NC}"

# Clean up
rm -rf "$TEMP_DIR"

echo -e "${YELLOW}Now upload this package to S3:${NC}"
echo -e "${BLUE}aws s3 cp $APP_DIR/$OUTPUT_FILE s3://$S3_BUCKET/$OUTPUT_FILE${NC}"

echo -e "${YELLOW}Then update the Dockerfile in create_minimal_package.sh to download this file:${NC}"
echo -e "${BLUE}aws s3 cp s3://$S3_BUCKET/$OUTPUT_FILE /tmp/app_code.zip && unzip /tmp/app_code.zip -d /var/app/current${NC}"

echo -e "${GREEN}${BOLD}======= APPLICATION CODE PREPARATION COMPLETE =======${NC}"
