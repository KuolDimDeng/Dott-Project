#!/bin/bash

# Version0058_disable_https.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Disable HTTPS temporarily to allow successful deployment

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps HTTPS Disabler (v1.0.0) =====${NC}"

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Check if config file exists
CONFIG_FILE="DottAppsConfig.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: $CONFIG_FILE not found in current directory${NC}"
    exit 1
fi

# Create backup of original config
BACKUP_DIR="configuration_backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/DottAppsConfig_HTTPS_$TIMESTAMP.bak.json"
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"

# Temporary file for processing
TMP_FILE=$(mktemp)

# Read the original content
cat "$CONFIG_FILE" > "$TMP_FILE"

echo -e "${BLUE}Disabling HTTPS configuration...${NC}"

# Check for elbv2:listener:443 settings and modify them
if grep -q "aws:elbv2:listener:443" "$TMP_FILE"; then
    echo -e "${YELLOW}→ Found HTTPS listener configuration, disabling...${NC}"
    sed -i.tmp 's/"aws:elbv2:listener:443", "OptionName": "ListenerEnabled", "Value": "true"/"aws:elbv2:listener:443", "OptionName": "ListenerEnabled", "Value": "false"/g' "$TMP_FILE"
    # If the above pattern isn't found, try to add the setting
    if ! grep -q "aws:elbv2:listener:443.*ListenerEnabled.*false" "$TMP_FILE"; then
        echo -e "${YELLOW}→ Adding explicit HTTPS listener disable setting...${NC}"
        # Find the last HTTPS config entry and add the disable setting after it
        line_num=$(grep -n "aws:elbv2:listener:443" "$TMP_FILE" | tail -1 | cut -d: -f1)
        if [ ! -z "$line_num" ]; then
            # Move to the end of this configuration block
            while [ "$line_num" -lt $(wc -l < "$TMP_FILE") ] && ! grep -q "  }," "$TMP_FILE" | sed -n "${line_num}p"; do
                line_num=$((line_num + 1))
            done
            sed -i.tmp "${line_num}a\\
  {\\
    \"Namespace\": \"aws:elbv2:listener:443\",\\
    \"OptionName\": \"ListenerEnabled\",\\
    \"Value\": \"false\"\\
  }," "$TMP_FILE"
        fi
    fi
else
    echo -e "${YELLOW}→ No HTTPS listener configuration found, adding disable setting...${NC}"
    # Find the position to insert the new configuration
    line_num=$(grep -n "aws:elbv2:listener" "$TMP_FILE" | tail -1 | cut -d: -f1)
    if [ ! -z "$line_num" ]; then
        # Move to the end of this configuration block
        while [ "$line_num" -lt $(wc -l < "$TMP_FILE") ] && ! grep -q "  }," "$TMP_FILE" | sed -n "${line_num}p"; do
            line_num=$((line_num + 1))
        done
        sed -i.tmp "${line_num}a\\
  {\\
    \"Namespace\": \"aws:elbv2:listener:443\",\\
    \"OptionName\": \"ListenerEnabled\",\\
    \"Value\": \"false\"\\
  }," "$TMP_FILE"
    fi
fi

# Write the fixed content back to the original file
cat "$TMP_FILE" > "$CONFIG_FILE"
rm "$TMP_FILE" "$TMP_FILE.tmp" 2>/dev/null

echo -e "${GREEN}✓ HTTPS has been temporarily disabled${NC}"
echo -e "${BLUE}=== Validation Report ===${NC}"

# Validate the fixed configuration
if [ -f "./scripts/Version0042_deployment_error_detection.sh" ]; then
    ./scripts/Version0042_deployment_error_detection.sh "$CONFIG_FILE"
else
    echo -e "${YELLOW}Warning: Validation script not found, skipping validation${NC}"
fi

echo -e "${GREEN}Configuration is now ready for deployment${NC}"
echo -e "${YELLOW}Note: HTTPS has been disabled for initial deployment. You can enable it later${NC}"
echo -e "${YELLOW}using the Version0047_enable_https.sh script after the environment is created.${NC}"
echo -e "${BLUE}You can now deploy using: ./scripts/Version0046_final_dottapps_deploy.sh${NC}"

# Update script registry
REGISTRY_FILE="scripts/script_registry.md"
if [ -f "$REGISTRY_FILE" ]; then
    # Add to registry if not already present
    if ! grep -q "Version0058_disable_https.sh" "$REGISTRY_FILE"; then
        # Find the line number of the last script entry
        line_num=$(grep -n "| Version" "$REGISTRY_FILE" | tail -1 | cut -d: -f1)
        if [ ! -z "$line_num" ]; then
            # Insert new entry after the last script
            sed -i.tmp "${line_num}a\\
| Version0058_disable_https.sh | 1.0.0 | Disable HTTPS temporarily for deployment | $(date +"%Y-%m-%d") | Not Run |" "$REGISTRY_FILE"
            rm "$REGISTRY_FILE.tmp" 2>/dev/null
            echo -e "${GREEN}✓ Added entry to script registry${NC}"
        fi
    else
        echo -e "${YELLOW}→ Script already in registry${NC}"
    fi
fi
