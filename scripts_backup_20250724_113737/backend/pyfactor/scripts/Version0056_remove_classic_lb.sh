#!/bin/bash

# Version0056_remove_classic_lb.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Remove Classic Load Balancer settings to prevent conflicts with Application Load Balancer

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps Load Balancer Configuration Fix (v1.0.0) =====${NC}"

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory if it doesn't exist
mkdir -p configuration_backups

# Back up original configuration file
CONFIG_FILE="DottAppsConfig.json"
BACKUP_FILE="configuration_backups/DottAppsConfig_LB_${TIMESTAMP}.bak.json"

if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"
else
    echo -e "${RED}Error: Configuration file $CONFIG_FILE not found${NC}"
    exit 1
fi

# Create a temporary file
TMP_FILE=$(mktemp)

# Remove Classic Load Balancer settings
echo -e "${BLUE}Removing Classic Load Balancer settings...${NC}"

# Count Classic Load Balancer entries
CLASSIC_LB_COUNT=$(grep -c "aws:elb:" "$CONFIG_FILE")
echo -e "${YELLOW}→ Found $CLASSIC_LB_COUNT Classic Load Balancer entries${NC}"

# Remove all aws:elb: namespace entries
grep -v "aws:elb:" "$CONFIG_FILE" > "$TMP_FILE"

# Count Application Load Balancer entries
APP_LB_COUNT=$(grep -c "aws:elbv2:" "$CONFIG_FILE")
echo -e "${GREEN}✓ Keeping $APP_LB_COUNT Application Load Balancer entries${NC}"

# Write the updated configuration back to the original file
cat "$TMP_FILE" > "$CONFIG_FILE"
rm -f "$TMP_FILE"

echo -e "${GREEN}✓ Classic Load Balancer settings removed successfully${NC}"

# Verify the changes
NEW_CLASSIC_LB_COUNT=$(grep -c "aws:elb:" "$CONFIG_FILE")
if [ "$NEW_CLASSIC_LB_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ Verification successful: All Classic Load Balancer settings removed${NC}"
else
    echo -e "${RED}Error: Some Classic Load Balancer settings remain ($NEW_CLASSIC_LB_COUNT entries)${NC}"
    exit 1
fi

# Make sure the JSON is still valid (basic check)
if ! cat "$CONFIG_FILE" | grep -q "^\[" || ! cat "$CONFIG_FILE" | grep -q "\]$"; then
    echo -e "${RED}Error: JSON structure appears to be damaged${NC}"
    echo -e "${YELLOW}Restoring from backup...${NC}"
    cp "$BACKUP_FILE" "$CONFIG_FILE"
    echo -e "${GREEN}Restored from backup${NC}"
    exit 1
fi

# Run error detection to validate the updated configuration
echo -e "${BLUE}=== Validating updated configuration ===${NC}"
./scripts/Version0042_deployment_error_detection.sh

# Display instructions for using the updated configuration
echo -e "${BLUE}=== Next Steps ===${NC}"
echo -e "1. ${YELLOW}Deploy with the updated configuration:${NC}"
echo -e "   ./scripts/Version0046_final_dottapps_deploy.sh"
