#!/bin/bash

# Version0068_create_eb_package_with_settings.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Create optimized EB deployment package with settings_eb.py

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== Creating Optimized EB Package with Settings =====\033[0m"

# Ensure we're in the backend/pyfactor directory
if [[ "$PWD" != *"backend/pyfactor" ]]; then
    echo -e "${YELLOW}Changing to the backend/pyfactor directory...\033[0m"
    cd "/Users/kuoldeng/projectx/backend/pyfactor" || {
        echo -e "${RED}Error: Cannot change to /Users/kuoldeng/projectx/backend/pyfactor\033[0m"
        exit 1
    }
fi

# Create timestamp for package name
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
PACKAGE_NAME="eb-package-with-settings-${TIMESTAMP}.zip"

# Verify settings_eb.py exists
if [ ! -f "pyfactor/settings_eb.py" ]; then
    echo -e "${RED}Error: settings_eb.py not found. Run Version0067_fix_settings_eb_module.sh first.\033[0m"
    exit 1
fi

# Create a temporary directory for the package
TEMP_DIR=$(mktemp -d)
echo -e "${YELLOW}Creating temporary directory: $TEMP_DIR\033[0m"

# Copy required files to the temporary directory
echo -e "${YELLOW}Copying files to the temporary directory...\033[0m"
cp -r .ebextensions $TEMP_DIR/
cp -r pyfactor $TEMP_DIR/
cp -r static $TEMP_DIR/ 2>/dev/null || mkdir -p $TEMP_DIR/static
cp -r templates $TEMP_DIR/ 2>/dev/null || mkdir -p $TEMP_DIR/templates
cp -r media $TEMP_DIR/ 2>/dev/null || mkdir -p $TEMP_DIR/media
cp requirements.txt $TEMP_DIR/
cp Dockerfile $TEMP_DIR/
cp manage.py $TEMP_DIR/

# Verify settings_eb.py was copied
if [ ! -f "$TEMP_DIR/pyfactor/settings_eb.py" ]; then
    echo -e "${RED}Error: Failed to copy settings_eb.py to the package\033[0m"
    rm -rf $TEMP_DIR
    exit 1
fi

# Create the zip package
echo -e "${YELLOW}Creating zip package...\033[0m"
cd $TEMP_DIR
zip -r "/Users/kuoldeng/projectx/backend/pyfactor/$PACKAGE_NAME" .

# Clean up the temporary directory
cd "/Users/kuoldeng/projectx/backend/pyfactor"
rm -rf $TEMP_DIR

# Check if the package was created successfully
if [ -f "$PACKAGE_NAME" ]; then
    echo -e "${GREEN}✓ Successfully created EB package: $PACKAGE_NAME $(du -h "$PACKAGE_NAME" | cut -f1)\033[0m"
    echo -e "${BLUE}To deploy this package, run:\033[0m"
    echo -e "${YELLOW}./scripts/Version0066_updated_solution_stack.sh\033[0m"
    echo -e "${YELLOW}Then select this package when prompted.\033[0m"
else
    echo -e "${RED}Error: Failed to create EB package\033[0m"
    exit 1
fi

exit 0
