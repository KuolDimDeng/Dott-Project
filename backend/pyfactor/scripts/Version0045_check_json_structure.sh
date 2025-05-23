#!/bin/bash

# Version0045_check_json_structure.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Verify and fix the JSON structure of DottApps configuration
# 
# This script performs a deep verification of the JSON structure in the DottApps
# configuration file, detecting format issues that might prevent proper parameter
# recognition during deployment.

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps JSON Structure Validator (v1.0.0) =====${NC}"

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Check if config file exists
CONFIG_FILE="DottAppsConfig.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: $CONFIG_FILE not found in current directory${NC}"
    exit 1
fi

# Create backup of original config
BACKUP_FILE="DottAppsConfig_Structure_${TIMESTAMP}.bak.json"
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. Will proceed with basic validation only.${NC}"
    BASIC_MODE=true
else
    BASIC_MODE=false
fi

# Validate JSON format first
if [ "$BASIC_MODE" = false ]; then
    if ! jq . "$CONFIG_FILE" > /dev/null 2>&1; then
        echo -e "${RED}Error: Invalid JSON format detected in configuration file${NC}"
        echo -e "${YELLOW}Attempting to fix basic JSON syntax...${NC}"
        
        # Try to fix JSON with a basic approach
        TMP_FILE=$(mktemp)
        cat "$CONFIG_FILE" | tr -d '\r' > "$TMP_FILE" # Remove any Windows line endings
        # Ensure the file starts with [ and ends with ]
        sed -i '' '1s/^[[:space:]]*{/[{/' "$TMP_FILE"
        sed -i '' '$s/}[[:space:]]*$/}]/' "$TMP_FILE"
        # Fix trailing commas in arrays
        sed -i '' 's/,[\n\s]*\]/]/g' "$TMP_FILE"
        
        if jq . "$TMP_FILE" > /dev/null 2>&1; then
            cp "$TMP_FILE" "$CONFIG_FILE"
            echo -e "${GREEN}✓ Fixed JSON syntax issues${NC}"
        else
            echo -e "${RED}Failed to automatically fix JSON syntax. Please check the file manually.${NC}"
            rm "$TMP_FILE"
            exit 1
        fi
        rm "$TMP_FILE"
    fi
fi

echo -e "${YELLOW}Checking Elastic Beanstalk ServiceRole...${NC}"

# Create a fixed JSON structure with explicit ServiceRole namespace
TMP_FILE=$(mktemp)

if [ "$BASIC_MODE" = true ]; then
    # If jq is not available, use grep and basic text manipulation
    SERVICE_ROLE=$(grep -A 1 "ServiceRole" "$CONFIG_FILE" | grep "Value" | awk -F'"' '{print $4}')
    
    if [ -z "$SERVICE_ROLE" ]; then
        echo -e "${RED}Error: ServiceRole not found in configuration${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Found ServiceRole: $SERVICE_ROLE${NC}"
    
    # More comprehensive approach using direct file editing
    echo "[" > "$TMP_FILE"
    echo "  {" >> "$TMP_FILE"
    echo "    \"Namespace\": \"aws:elasticbeanstalk:environment\"," >> "$TMP_FILE"
    echo "    \"OptionName\": \"ServiceRole\"," >> "$TMP_FILE"
    echo "    \"Value\": \"$SERVICE_ROLE\"" >> "$TMP_FILE"
    echo "  }," >> "$TMP_FILE"
    
    # Add all other configuration elements except ServiceRole
    # Skip first line (opening bracket) and the ServiceRole element we replaced
    grep -v "ServiceRole" "$CONFIG_FILE" | grep -v "^\\[" | grep -v "^\\]" >> "$TMP_FILE"
    
    # Fix the last line (remove trailing comma if present)
    sed -i '' '$ s/,$//' "$TMP_FILE"
    
    # Close the JSON array
    echo "]" >> "$TMP_FILE"
else
    # Use jq for more robust JSON manipulation
    SERVICE_ROLE=$(jq -r '.[] | select(.OptionName=="ServiceRole") | .Value' "$CONFIG_FILE")
    
    if [ -z "$SERVICE_ROLE" ] || [ "$SERVICE_ROLE" = "null" ]; then
        echo -e "${RED}Error: ServiceRole not found in configuration${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Found ServiceRole: $SERVICE_ROLE${NC}"
    
    # Create new JSON with corrected structure
    jq '[{
        "Namespace": "aws:elasticbeanstalk:environment",
        "OptionName": "ServiceRole",
        "Value": "'"$SERVICE_ROLE"'"
    } + (.[0] | del(.OptionName) | del(.Value))] + .[1:]' "$CONFIG_FILE" > "$TMP_FILE"
fi

# Check for other critical parameters
echo -e "${YELLOW}Checking VPC settings...${NC}"
VPC_ID=$(grep -A 1 "VPCId" "$CONFIG_FILE" | grep "Value" | awk -F'"' '{print $4}')
if [ -n "$VPC_ID" ]; then
    echo -e "${GREEN}✓ Found VPC ID: $VPC_ID${NC}"
fi

echo -e "${YELLOW}Checking for SSL certificate...${NC}"
SSL_CERT=$(grep -A 1 "SSLCertificateId" "$CONFIG_FILE" | grep "Value" | awk -F'"' '{print $4}')
if [ -n "$SSL_CERT" ]; then
    echo -e "${GREEN}✓ Found SSL Certificate: $SSL_CERT${NC}"
else
    echo -e "${YELLOW}No SSL Certificate configured. HTTPS will be disabled.${NC}"
fi

# Replace the original file with our fixed version
cp "$TMP_FILE" "$CONFIG_FILE"
rm "$TMP_FILE"

echo -e "${GREEN}✓ JSON structure verification complete${NC}"
echo -e "${BLUE}=== Validation Report ===${NC}"

# Validate the fixed configuration
./scripts/Version0042_deployment_error_detection.sh "$CONFIG_FILE"

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}Next Steps:${NC}"
echo -e "1. If validation failed, examine the backup file to troubleshoot: $BACKUP_FILE"
echo -e "2. After successful validation, deploy using: ./scripts/Version0041_improved_deploy_dottapps_env.sh"
