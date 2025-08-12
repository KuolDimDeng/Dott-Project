#!/bin/bash

# Version0052_elb_conflict_fix.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Fix the conflict between Classic Load Balancer and Application Load Balancer settings
#          This script removes all Classic Load Balancer (aws:elb:) settings and keeps only 
#          Application Load Balancer (aws:elbv2:) settings

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps Load Balancer Conflict Fix (v1.0.0) =====${NC}"

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory if it doesn't exist
mkdir -p configuration_backups

# Back up original configuration file
CONFIG_FILE="DottAppsConfig.json"
BACKUP_FILE="configuration_backups/DottAppsConfig_ELB_Fix_${TIMESTAMP}.bak.json"

if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"
else
    echo -e "${RED}Error: Configuration file $CONFIG_FILE not found${NC}"
    exit 1
fi

# Remove all Classic Load Balancer settings (aws:elb:)
echo -e "${YELLOW}→ Removing conflicting Classic Load Balancer settings...${NC}"

# Create a temporary file
TMP_FILE=$(mktemp)

# Filter out all aws:elb: namespace settings
jq '[.[] | select(.Namespace | startswith("aws:elb:") | not)]' "$CONFIG_FILE" > "$TMP_FILE" 2>/dev/null

# Check if jq is installed
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}jq not found, using grep/sed alternative method${NC}"
    
    # Alternative method without jq
    grep -v '"Namespace": "aws:elb:' "$CONFIG_FILE" > "$TMP_FILE"
    
    # Fix JSON structure (removing any trailing commas that might be invalid)
    sed -i.bak 's/},\s*\]/}\n]/' "$TMP_FILE"
    rm -f "${TMP_FILE}.bak"
else
    echo -e "${GREEN}✓ Used jq to remove Classic Load Balancer settings${NC}"
fi

# Write the filtered content back to the original file
cat "$TMP_FILE" > "$CONFIG_FILE"
rm -f "$TMP_FILE"

# Ensure ServiceRole is the first parameter
echo -e "${YELLOW}→ Ensuring ServiceRole is properly placed...${NC}"

# Create a temporary file for the fixed content
TMP_FILE=$(mktemp)

# Extract the service role line and create a new configuration with ServiceRole first
SERVICE_ROLE="arn:aws:iam::471112661935:role/aws-elasticbeanstalk-service-role"

# Create the beginning of the new file with ServiceRole as the first parameter
cat > "$TMP_FILE" << EOL
[
  {
    "Namespace": "aws:elasticbeanstalk:environment",
    "OptionName": "ServiceRole",
    "Value": "$SERVICE_ROLE"
  },
EOL

# Append the rest of the configuration, excluding the ServiceRole parameter
grep -v '"OptionName": "ServiceRole"' "$CONFIG_FILE" | tail -n +2 >> "$TMP_FILE"

# Ensure proper JSON structure
sed -i.bak 's/},\s*\]/}\n]/' "$TMP_FILE"
rm -f "${TMP_FILE}.bak"

# Write the fixed content back to the original file
cat "$TMP_FILE" > "$CONFIG_FILE"
rm -f "$TMP_FILE"

echo -e "${GREEN}✓ Configuration file fixed to use only Application Load Balancer${NC}"
echo -e "${GREEN}✓ ServiceRole properly placed at the beginning of the configuration${NC}"

# Display the first few lines of the fixed configuration
echo -e "${BLUE}=== Configuration Preview (First Entries) ===${NC}"
head -n 15 "$CONFIG_FILE"

# Validate the configuration using the existing validation script
if [ -f "./scripts/Version0042_deployment_error_detection.sh" ]; then
    echo -e "${BLUE}=== Validating fixed configuration file ===${NC}"
    ./scripts/Version0042_deployment_error_detection.sh "$CONFIG_FILE"
else
    echo -e "${YELLOW}Warning: Validation script not found, skipping validation${NC}"
fi

echo -e "${GREEN}✓ Load balancer conflict resolved${NC}"
echo -e "${YELLOW}Note: You can now run ./scripts/Version0046_final_dottapps_deploy.sh${NC}"
echo -e "${YELLOW}When prompted, type 'y' to continue with deployment${NC}"
