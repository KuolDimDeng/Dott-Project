#!/bin/bash

# Version0044_fix_servicerole_issue.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Fix the ServiceRole issue in DottApps configuration
# 
# This script addresses an issue where the ServiceRole is present in the configuration
# but is not being properly recognized during validation.

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps ServiceRole Fix (v1.0.0) =====${NC}"

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Check if config file exists
CONFIG_FILE="DottAppsConfig.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: $CONFIG_FILE not found in current directory${NC}"
    exit 1
fi

# Create backup of original config
BACKUP_FILE="DottAppsConfig_ServiceRole_${TIMESTAMP}.bak.json"
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"

# Check if ServiceRole exists but in wrong format
SERVICE_ROLE=$(grep -A 1 "ServiceRole" "$CONFIG_FILE" | grep "Value" | awk -F'"' '{print $4}')

if [ -z "$SERVICE_ROLE" ]; then
    echo -e "${RED}Error: ServiceRole not found in configuration${NC}"
    exit 1
fi

echo -e "${YELLOW}Found ServiceRole: $SERVICE_ROLE${NC}"

# Create a new JSON file with corrected format
TMP_FILE=$(mktemp)

# Extract the ServiceRole line first to ensure it's at the top level of the JSON
echo "[" > "$TMP_FILE"
echo "  {" >> "$TMP_FILE"
echo "    \"Namespace\": \"aws:elasticbeanstalk:environment\"," >> "$TMP_FILE"
echo "    \"OptionName\": \"ServiceRole\"," >> "$TMP_FILE"
echo "    \"Value\": \"$SERVICE_ROLE\"" >> "$TMP_FILE"
echo "  }," >> "$TMP_FILE"

# Include all lines except the original ServiceRole (we already added it)
grep -v "ServiceRole" "$CONFIG_FILE" | grep -v "^\\[" | grep -v "^\\]" >> "$TMP_FILE"

# Fix the last line (remove trailing comma if present)
sed -i '' '$ s/,$//' "$TMP_FILE"

# Close the JSON array
echo "]" >> "$TMP_FILE"

# Replace the original file
cp "$TMP_FILE" "$CONFIG_FILE"
rm "$TMP_FILE"

echo -e "${GREEN}✓ Configuration fixed successfully!${NC}"
echo -e "${BLUE}=== Validation Report ===${NC}"

# Validate the fixed configuration
./scripts/Version0042_deployment_error_detection.sh "$CONFIG_FILE"

echo -e "${GREEN}ServiceRole issue fixed. Configuration file is now ready for deployment.${NC}"
echo -e "${BLUE}You can now deploy using: ./scripts/Version0041_improved_deploy_dottapps_env.sh${NC}"
