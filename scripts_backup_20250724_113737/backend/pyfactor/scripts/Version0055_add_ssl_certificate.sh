#!/bin/bash

# Version0055_add_ssl_certificate.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Add SSL certificate to the Elastic Beanstalk configuration

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps SSL Certificate Configuration (v1.0.0) =====${NC}"

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory if it doesn't exist
mkdir -p configuration_backups

# Back up original configuration file
CONFIG_FILE="DottAppsConfig.json"
BACKUP_FILE="configuration_backups/DottAppsConfig_SSL_${TIMESTAMP}.bak.json"

if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"
else
    echo -e "${RED}Error: Configuration file $CONFIG_FILE not found${NC}"
    exit 1
fi

# The Certificate ARN from AWS Certificate Manager
CERT_ARN="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"
echo -e "${YELLOW}→ Using SSL Certificate: $CERT_ARN${NC}"

# Create a temporary file
TMP_FILE=$(mktemp)

# Add SSL certificate configuration
echo -e "${BLUE}Adding SSL certificate configuration...${NC}"

# First, read the existing configuration
cat "$CONFIG_FILE" > "$TMP_FILE"

# Check if we need to add or update the configuration
if grep -q "aws:elbv2:listener:443" "$TMP_FILE"; then
    echo -e "${YELLOW}→ HTTPS listener already exists, updating SSL certificate configuration...${NC}"
    
    # Check if SSLCertificateArns is already present
    if grep -q "SSLCertificateArns" "$TMP_FILE"; then
        echo -e "${YELLOW}→ Updating existing SSL certificate ARN...${NC}"
        sed -i.tmp 's|"OptionName": "SSLCertificateArns",\n    "Value": ".*"|"OptionName": "SSLCertificateArns",\n    "Value": "'$CERT_ARN'"|g' "$TMP_FILE"
    else
        echo -e "${YELLOW}→ Adding SSL certificate ARN to existing HTTPS listener...${NC}"
        # Add SSLCertificateArns to existing HTTPS listener configuration
        awk -v cert="$CERT_ARN" '
        /aws:elbv2:listener:443/ {
            print $0;
            getline;
            print $0;
            if ($0 ~ /"OptionName": "Protocol"/) {
                print "  },";
                print "  {";
                print "    \"Namespace\": \"aws:elbv2:listener:443\",";
                print "    \"OptionName\": \"SSLCertificateArns\",";
                print "    \"Value\": \"" cert "\"";
                next;
            }
        }
        { print $0 }' "$TMP_FILE" > "${TMP_FILE}.new"
        mv "${TMP_FILE}.new" "$TMP_FILE"
    fi
else
    echo -e "${YELLOW}→ Adding new HTTPS listener with SSL certificate configuration...${NC}"
    
    # Find where to insert the new configuration - before the closing bracket
    sed -i.tmp '$ i\
  },\
  {\
    "Namespace": "aws:elbv2:listener:443",\
    "OptionName": "Protocol",\
    "Value": "HTTPS"\
  },\
  {\
    "Namespace": "aws:elbv2:listener:443",\
    "OptionName": "SSLCertificateArns",\
    "Value": "'$CERT_ARN'"\
  },\
  {\
    "Namespace": "aws:elbv2:listener:443",\
    "OptionName": "DefaultProcess",\
    "Value": "default"\
  },\
  {\
    "Namespace": "aws:elbv2:listener:443",\
    "OptionName": "Rules",\
    "Value": "default"\
' "$TMP_FILE"
fi

# Remove temporary files
rm -f "${TMP_FILE}.tmp" 2>/dev/null

# Write the updated configuration back to the original file
cat "$TMP_FILE" > "$CONFIG_FILE"
rm -f "$TMP_FILE"

echo -e "${GREEN}✓ SSL certificate configuration added/updated successfully${NC}"

# Verify that the SSL certificate is properly configured
if grep -q "$CERT_ARN" "$CONFIG_FILE"; then
    echo -e "${GREEN}✓ SSL certificate ARN verified in configuration file${NC}"
else
    echo -e "${RED}Error: SSL certificate ARN not found in updated configuration${NC}"
    exit 1
fi

# Display instructions for using the updated configuration
echo -e "${BLUE}=== Next Steps ===${NC}"
echo -e "1. ${YELLOW}Validate the configuration:${NC}"
echo -e "   ./scripts/Version0042_deployment_error_detection.sh"
echo -e "2. ${YELLOW}Deploy with the updated configuration:${NC}"
echo -e "   ./scripts/Version0046_final_dottapps_deploy.sh"
echo -e ""
echo -e "${BLUE}=== Certificate Details ===${NC}"
echo -e "Certificate ARN: ${YELLOW}$CERT_ARN${NC}"
echo -e "Domains: ${YELLOW}dottapps.com, www.dottapps.com${NC}"
echo -e "Note: Ensure that DNS records for these domains are properly configured to point to your Elastic Beanstalk environment."
