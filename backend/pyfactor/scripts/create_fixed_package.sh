#!/bin/bash
# create_fixed_package.sh - Create a fixed deployment package for Elastic Beanstalk
# This script extracts the existing package and replaces the problematic .ebextensions file

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Step 1: Create a temporary directory for extraction
echo -e "${BLUE}Creating temporary extraction directory...${NC}"
TEMP_DIR="fixed_package_temp"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR
mkdir -p $TEMP_DIR/.ebextensions

# Step 2: Extract the original package
echo -e "${BLUE}Extracting original package...${NC}"
SOURCE_PACKAGE="fixed-docker-eb-package-final.zip"
unzip -q $SOURCE_PACKAGE -d $TEMP_DIR

# Step 3: Replace the problematic .ebextensions file
echo -e "${BLUE}Replacing problematic .ebextensions file...${NC}"
cp temp_extract_fix/04_django_fixed.config $TEMP_DIR/temp_extract/.ebextensions/04_django.config

# Step 4: Create the new package
echo -e "${BLUE}Creating new package...${NC}"
OUTPUT_PACKAGE="fixed-docker-eb-package-clean.zip"
cd $TEMP_DIR
zip -rq ../$OUTPUT_PACKAGE .
cd ..

# Step 5: Clean up
echo -e "${BLUE}Cleaning up...${NC}"
rm -rf $TEMP_DIR

# Step 6: Verify
if [ -f "$OUTPUT_PACKAGE" ]; then
  echo -e "${GREEN}Successfully created fixed package: $OUTPUT_PACKAGE${NC}"
  echo -e "${GREEN}Package size: $(du -h $OUTPUT_PACKAGE | cut -f1)${NC}"
else
  echo -e "${RED}Failed to create fixed package${NC}"
  exit 1
fi
