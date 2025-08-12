#!/bin/bash

# Version0049_servicerole_enforcer.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Force the correct ServiceRole parameter to be the first item in configuration
# 
# This script ensures that the ServiceRole parameter is properly formatted and positioned 
# as the first item in the configuration file, which is critical for AWS Elastic Beanstalk
# to recognize it correctly.

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps ServiceRole Enforcer (v1.0.0) =====${NC}"

# Check if config file exists
CONFIG_FILE="DottAppsConfig.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: $CONFIG_FILE not found in current directory${NC}"
    exit 1
fi

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="DottAppsConfig_ServiceRole_${TIMESTAMP}.bak.json"
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"

# Extract the ServiceRole ARN value if it exists
SERVICE_ROLE=$(grep -A 1 "ServiceRole" "$CONFIG_FILE" | grep "Value" | sed 's/.*"Value": "\(.*\)".*/\1/')
if [ -z "$SERVICE_ROLE" ]; then
    SERVICE_ROLE="arn:aws:iam::471112661935:role/aws-elasticbeanstalk-service-role"
    echo -e "${YELLOW}→ Using default ServiceRole: $SERVICE_ROLE${NC}"
else
    echo -e "${GREEN}✓ Found ServiceRole: $SERVICE_ROLE${NC}"
fi

# Create a temporary file with the ServiceRole as the first parameter
TEMP_FILE=$(mktemp)

# Write the beginning of the array
echo "[" > "$TEMP_FILE"

# Add the ServiceRole as the first parameter with exact AWS EB format
cat >> "$TEMP_FILE" << EOF
  {
    "Namespace": "aws:elasticbeanstalk:environment",
    "OptionName": "ServiceRole",
    "Value": "$SERVICE_ROLE"
  },
EOF

# Add the rest of the configuration file, skipping any existing ServiceRole entries
grep -v "ServiceRole" "$CONFIG_FILE" | sed '1d' | sed '$d' > "$TEMP_FILE.rest"
cat "$TEMP_FILE.rest" >> "$TEMP_FILE"
rm "$TEMP_FILE.rest"

# Ensure the file ends properly
sed -i.tmp '$s/,$//' "$TEMP_FILE"
echo "]" >> "$TEMP_FILE"
rm "$TEMP_FILE.tmp"

# Copy the fixed file back
mv "$TEMP_FILE" "$CONFIG_FILE"

echo -e "${GREEN}✓ ServiceRole parameter enforced at the beginning of the configuration file${NC}"
echo -e "${BLUE}=== Fixed Configuration ===${NC}"

# Show the beginning of the fixed file to confirm ServiceRole placement
head -n 7 "$CONFIG_FILE"

# Remove both Classic and Application load balancer conflicting settings
echo -e "${YELLOW}→ Removing conflicting load balancer settings...${NC}"
TEMP_FILE=$(mktemp)

# Filter out aws:elb: namespace entries which are classic load balancer settings
jq '[.[] | select(.Namespace | startswith("aws:elb:") | not)]' "$CONFIG_FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$CONFIG_FILE"

echo -e "${GREEN}✓ Configuration file ready for deployment${NC}"
echo -e "${YELLOW}Note: You can now run ./scripts/Version0046_final_dottapps_deploy.sh${NC}"
echo -e "${YELLOW}When prompted, type 'y' to continue despite validation warnings${NC}"
