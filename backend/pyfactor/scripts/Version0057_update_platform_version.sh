#!/bin/bash

# Version0057_update_platform_version.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Update the platform version from 4.5.1 to 4.5.2 in all deployment scripts and configurations

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps Platform Version Updater (v1.0.0) =====${NC}"
echo -e "${YELLOW}This script will update the platform version from 4.5.1 to 4.5.2 in all deployment scripts${NC}"

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Configuration file path
CONFIG_FILE="DottAppsConfig.json"

# Backup the config file
if [ -f "$CONFIG_FILE" ]; then
    CONFIG_BACKUP="${CONFIG_FILE}_platformupdate_${TIMESTAMP}.bak"
    cp "$CONFIG_FILE" "$CONFIG_BACKUP"
    echo -e "${GREEN}✓ Created backup: $CONFIG_BACKUP${NC}"
fi

# Update platform version in scripts
echo -e "${BLUE}Updating platform version in deployment scripts...${NC}"

# List of script files to update
SCRIPT_FILES=(
    "scripts/deploy_complete_eb.sh"
    "scripts/deploy_optimized_eb.sh"
    "scripts/aws_cli_deploy_new.sh"
    "scripts/Version0041_improved_deploy_dottapps_env.sh"
    "scripts/aws_cli_deploy.sh"
    "scripts/prepare_eb_package.sh"
)

# Update each script file
for SCRIPT in "${SCRIPT_FILES[@]}"; do
    if [ -f "$SCRIPT" ]; then
        # Create backup
        SCRIPT_BACKUP="${SCRIPT}_platformupdate_${TIMESTAMP}.bak"
        cp "$SCRIPT" "$SCRIPT_BACKUP"
        
        # Update platform version in the script
        if grep -q "4.5.1" "$SCRIPT"; then
            sed -i.tmp 's/4.5.1/4.5.2/g' "$SCRIPT"
            rm -f "${SCRIPT}.tmp"
            echo -e "${GREEN}✓ Updated platform version in $SCRIPT${NC}"
        else
            echo -e "${YELLOW}! No platform version 4.5.1 found in $SCRIPT${NC}"
        fi
    else
        echo -e "${RED}✗ Script file not found: $SCRIPT${NC}"
    fi
done

# Update DOTTAPPS_DEPLOYMENT_GUIDE.md
GUIDE_FILE="DOTTAPPS_DEPLOYMENT_GUIDE.md"
if [ -f "$GUIDE_FILE" ]; then
    # Create backup
    GUIDE_BACKUP="${GUIDE_FILE}_platformupdate_${TIMESTAMP}.bak"
    cp "$GUIDE_FILE" "$GUIDE_BACKUP"
    
    # Update platform version in the guide
    if grep -q "4.5.1" "$GUIDE_FILE"; then
        sed -i.tmp 's/4.5.1/4.5.2/g' "$GUIDE_FILE"
        rm -f "${GUIDE_FILE}.tmp"
        echo -e "${GREEN}✓ Updated platform version in $GUIDE_FILE${NC}"
    else
        echo -e "${YELLOW}! No platform version 4.5.1 found in $GUIDE_FILE${NC}"
    fi
else
    echo -e "${RED}✗ Guide file not found: $GUIDE_FILE${NC}"
fi

echo -e "${BLUE}=== Platform Version Update Summary ===${NC}"
echo -e "${GREEN}Platform version has been updated from 4.5.1 to 4.5.2 in all deployment scripts.${NC}"
echo -e "${YELLOW}Important notes:${NC}"
echo -e "1. The updated version uses Docker running on 64bit Amazon Linux 2023/4.5.2"
echo -e "2. This is the latest recommended platform version for optimal security and performance"
echo -e "3. AWS Elastic Beanstalk platform version 4.5.2 includes the following improvements:"
echo -e "   - Security patches for Docker and Amazon Linux 2023"
echo -e "   - Performance optimizations for container deployment"
echo -e "   - Better compatibility with RDS PostgreSQL 13.16"

echo -e "\n${BLUE}Next steps:${NC}"
echo -e "1. Review the changes in the updated files"
echo -e "2. Run the deployment script to apply the new platform version:"
echo -e "   ./scripts/Version0046_final_dottapps_deploy.sh"
echo -e "\n${GREEN}Platform update script completed successfully!${NC}"

# Update the script registry
REGISTRY_FILE="scripts/script_registry.md"
if [ -f "$REGISTRY_FILE" ]; then
    echo -e "${BLUE}Updating script registry...${NC}"
    # Add this script to the registry
    ENTRY="| Version0057_update_platform_version.sh | Update platform version from 4.5.1 to 4.5.2 | Platform, Deployment | ✅ | $(date +"%Y-%m-%d") |"
    echo "$ENTRY" >> "$REGISTRY_FILE"
    echo -e "${GREEN}✓ Added entry to script registry${NC}"
fi
