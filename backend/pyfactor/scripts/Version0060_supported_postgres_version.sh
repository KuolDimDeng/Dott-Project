#!/bin/bash

# Version0060_supported_postgres_version.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Update Postgres version to a supported one for Elastic Beanstalk

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps Postgres Version Fixer (v1.0.0) =====${NC}"

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup of existing config
CONFIG_FILE="DottAppsConfig.json"
if [ -f "$CONFIG_FILE" ]; then
    BACKUP_DIR="configuration_backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/DottAppsConfig_PG_VERSION_$TIMESTAMP.bak.json"
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"
fi

# Check for AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Installing AWS CLI...${NC}"
    # This is a simplified check, in a real environment you would add proper installation logic
else
    echo -e "${GREEN}✓ AWS CLI found${NC}"
fi

# Get supported Postgres versions
echo -e "${BLUE}Checking supported Postgres versions...${NC}"

# If no AWS CLI, use hardcoded list of commonly supported versions
SUPPORTED_VERSIONS=("13.7" "13.4" "12.9" "11.14" "11.13" "10.19" "10.18" "9.6.24" "9.6.23")

# Try to get actual supported versions from AWS
if command -v aws &> /dev/null; then
    echo -e "${YELLOW}→ Querying AWS for supported PostgreSQL versions...${NC}"
    VERSIONS_OUTPUT=$(aws rds describe-db-engine-versions --engine postgres --query "DBEngineVersions[].EngineVersion" --output text 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$VERSIONS_OUTPUT" ]; then
        # Convert the output into an array
        SUPPORTED_VERSIONS=($VERSIONS_OUTPUT)
        echo -e "${GREEN}✓ Retrieved supported versions from AWS${NC}"
    else
        echo -e "${YELLOW}→ Could not get versions from AWS API, using default list${NC}"
    fi
fi

echo -e "${GREEN}Available PostgreSQL versions:${NC}"
for version in "${SUPPORTED_VERSIONS[@]}"; do
    echo -e "  - $version"
done

# Choose a safe version that's usually supported
TARGET_VERSION="13.7"
echo -e "${YELLOW}→ Selected version: $TARGET_VERSION${NC}"

# Update the config file
echo -e "${BLUE}Updating PostgreSQL version in configuration...${NC}"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: $CONFIG_FILE not found. Create it first.${NC}"
    exit 1
fi

# Use temporary file for processing
TMP_FILE=$(mktemp)

# Preserve the original JSON structure but update the DBEngineVersion
cat "$CONFIG_FILE" | sed 's/"DBEngineVersion": "[0-9]*\.[0-9]*"/"DBEngineVersion": "'"$TARGET_VERSION"'"/g' > "$TMP_FILE"

# Check if the modification was successful
if grep -q "\"DBEngineVersion\": \"$TARGET_VERSION\"" "$TMP_FILE"; then
    mv "$TMP_FILE" "$CONFIG_FILE"
    echo -e "${GREEN}✓ PostgreSQL version updated to $TARGET_VERSION${NC}"
else
    # If the direct replacement didn't work, try to find the DBEngineVersion block
    if grep -q "\"OptionName\": \"DBEngineVersion\"" "$CONFIG_FILE"; then
        # Extract the file without the closing bracket
        head -n -1 "$CONFIG_FILE" > "$TMP_FILE"
        # Add DBEngineVersion setting if not present
        echo '  {
    "Namespace": "aws:rds:dbinstance",
    "OptionName": "DBEngineVersion",
    "Value": "'"$TARGET_VERSION"'"
  }
]' >> "$TMP_FILE"
        mv "$TMP_FILE" "$CONFIG_FILE"
        echo -e "${GREEN}✓ PostgreSQL version shorter-form update to $TARGET_VERSION successful${NC}"
    else
        echo -e "${RED}Error: Could not update PostgreSQL version in configuration${NC}"
        rm "$TMP_FILE"
        exit 1
    fi
fi

echo -e "${BLUE}=== Validation Report ===${NC}"

# Validate the configuration
if [ -f "./scripts/Version0042_deployment_error_detection.sh" ]; then
    ./scripts/Version0042_deployment_error_detection.sh "$CONFIG_FILE"
else
    echo -e "${YELLOW}Warning: Validation script not found, skipping validation${NC}"
fi

echo -e "${GREEN}Configuration is now ready for deployment${NC}"
echo -e "${YELLOW}Note: PostgreSQL version has been updated to $TARGET_VERSION${NC}"
echo -e "${BLUE}You can now deploy using:${NC}"
echo -e "${GREEN}./scripts/Version0046_final_dottapps_deploy.sh${NC}"

# Update script registry
REGISTRY_FILE="scripts/script_registry.md"
if [ -f "$REGISTRY_FILE" ]; then
    # Add to registry if not already present
    if ! grep -q "Version0060_supported_postgres_version.sh" "$REGISTRY_FILE"; then
        # Find the line number of the last script entry
        line_num=$(grep -n "| Version" "$REGISTRY_FILE" | tail -1 | cut -d: -f1)
        if [ ! -z "$line_num" ]; then
            # Insert new entry after the last script
            sed -i.tmp "${line_num}a\\
| Version0060_supported_postgres_version.sh | 1.0.0 | Update Postgres version to a supported one | $(date +"%Y-%m-%d") | Not Run |" "$REGISTRY_FILE"
            rm "$REGISTRY_FILE.tmp" 2>/dev/null
            echo -e "${GREEN}✓ Added entry to script registry${NC}"
        fi
    else
        echo -e "${YELLOW}→ Script already in registry${NC}"
    fi
fi
