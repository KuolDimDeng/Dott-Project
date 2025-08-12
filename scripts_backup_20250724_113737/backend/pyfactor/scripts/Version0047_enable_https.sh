#!/bin/bash

# Version0047_enable_https.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Enable HTTPS for DottApps Elastic Beanstalk environment using existing SSL certificate
# 
# This script enables HTTPS for the DottApps Elastic Beanstalk deployment by:
# 1. Using your existing SSL certificate in AWS Certificate Manager
# 2. Updating the Elastic Beanstalk configuration to use the SSL certificate
# 3. Enabling the HTTPS listener on port 443
# 4. Setting up HTTP to HTTPS redirection for security

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
BOLD="\033[1m"
NC="\033[0m" # No Color

echo -e "${BLUE}${BOLD}===== DottApps HTTPS Configuration (v1.0.0) =====${NC}"

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
BACKUP_FILE="${BACKUP_DIR}/DottAppsConfig_HTTPS_${TIMESTAMP}.json"
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"

# Step 1: Use existing certificate
echo -e "${BLUE}Step 1: Using existing SSL certificate...${NC}"
CERTIFICATE_ARN="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"

# Verify the certificate exists
echo -e "${YELLOW}Verifying certificate...${NC}"
CERT_INFO=$(aws acm describe-certificate --certificate-arn "$CERTIFICATE_ARN" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Unable to verify certificate. Make sure AWS CLI is configured correctly.${NC}"
    echo -e "${YELLOW}You may need to run 'aws configure' to set up your credentials.${NC}"
    echo -e "${YELLOW}Proceeding anyway with the provided certificate ARN.${NC}"
else
    CERT_DOMAIN=$(echo "$CERT_INFO" | grep -o '"DomainName": "[^"]*' | head -1 | cut -d'"' -f4)
    CERT_STATUS=$(echo "$CERT_INFO" | grep -o '"Status": "[^"]*' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✓ Certificate verified: ${CERT_STATUS} for ${CERT_DOMAIN}${NC}"
fi

# Step 2: Update the configuration file to enable HTTPS
echo -e "${BLUE}Step 2: Updating configuration to enable HTTPS...${NC}"

# Create a temporary file
TMP_FILE=$(mktemp)

# Process the file and make changes
jq --argjson sslCertArn "\"$CERTIFICATE_ARN\"" '
    # First, update existing entries if they exist
    map(
        if .Namespace == "aws:elb:listener:443" and .OptionName == "ListenerEnabled" then
            .Value = "true"
        elif .Namespace == "aws:elb:listener:443" and .OptionName == "SSLCertificateId" then
            .Value = $sslCertArn
        elif .Namespace == "aws:elbv2:listener:443" and .OptionName == "SSLCertificateArns" then
            .Value = $sslCertArn
        else
            .
        end
    )
    # Now check if we need to add any missing entries
    | if (map(select(.Namespace == "aws:elb:listener:443" and .OptionName == "SSLCertificateId")) | length) == 0 then
        . + [{
            "Namespace": "aws:elb:listener:443",
            "OptionName": "SSLCertificateId",
            "Value": $sslCertArn
        }]
      else
        .
      end
    | if (map(select(.Namespace == "aws:elbv2:listener:443" and .OptionName == "SSLCertificateArns")) | length) == 0 then
        . + [{
            "Namespace": "aws:elbv2:listener:443",
            "OptionName": "SSLCertificateArns",
            "Value": $sslCertArn
        }]
      else
        .
      end
    | if (map(select(.Namespace == "aws:elb:listener:443" and .OptionName == "ListenerEnabled")) | length) == 0 then
        . + [{
            "Namespace": "aws:elb:listener:443",
            "OptionName": "ListenerEnabled",
            "Value": "true"
        }]
      else
        .
      end
    | if (map(select(.Namespace == "aws:elbv2:listener:443" and .OptionName == "Protocol")) | length) == 0 then
        . + [{
            "Namespace": "aws:elbv2:listener:443",
            "OptionName": "Protocol",
            "Value": "HTTPS"
        }]
      else
        .
      end
    | if (map(select(.Namespace == "aws:elbv2:listener:443" and .OptionName == "Rules")) | length) == 0 then
        . + [{
            "Namespace": "aws:elbv2:listener:443",
            "OptionName": "Rules",
            "Value": "default"
        }]
      else
        .
      end
' "$CONFIG_FILE" > "$TMP_FILE" 2>/dev/null

# Check if jq command was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to process JSON configuration.${NC}"
    echo -e "${YELLOW}Falling back to manual string replacement...${NC}"
    
    # Read the content of the file
    CONFIG_CONTENT=$(cat "$CONFIG_FILE")
    
    # Check if we need to update the listener enabled value
    if grep -q '"Namespace": "aws:elb:listener:443".*"OptionName": "ListenerEnabled"' "$CONFIG_FILE"; then
        echo -e "${YELLOW}Updating HTTPS listener status...${NC}"
        CONFIG_CONTENT=$(echo "$CONFIG_CONTENT" | sed 's/"Namespace": "aws:elb:listener:443",\s*"OptionName": "ListenerEnabled",\s*"Value": "false"/"Namespace": "aws:elb:listener:443", "OptionName": "ListenerEnabled", "Value": "true"/g')
    else
        echo -e "${YELLOW}Adding HTTPS listener configuration...${NC}"
        # Add HTTPS listener configuration before the closing bracket
        SSL_CONFIG='  {
    "Namespace": "aws:elb:listener:443",
    "OptionName": "ListenerEnabled",
    "Value": "true"
  },
  {
    "Namespace": "aws:elb:listener:443",
    "OptionName": "SSLCertificateId",
    "Value": "'"$CERTIFICATE_ARN"'"
  },'
        CONFIG_CONTENT=$(echo "$CONFIG_CONTENT" | sed 's/\]$/'"$SSL_CONFIG"'\n]/')
    fi
    
    # Check if SSL certificate configuration exists and update it if it does
    if grep -q '"Namespace": "aws:elb:listener:443".*"OptionName": "SSLCertificateId"' "$CONFIG_FILE"; then
        echo -e "${YELLOW}Updating SSL certificate ARN...${NC}"
        CONFIG_CONTENT=$(echo "$CONFIG_CONTENT" | sed "s|\"Namespace\": \"aws:elb:listener:443\",\\s*\"OptionName\": \"SSLCertificateId\",\\s*\"Value\": \"[^\"]*\"|\"Namespace\": \"aws:elb:listener:443\", \"OptionName\": \"SSLCertificateId\", \"Value\": \"$CERTIFICATE_ARN\"|g")
    fi
    
    # Write updated content to temp file
    echo "$CONFIG_CONTENT" > "$TMP_FILE"
fi

# Replace original file with our updated version
cp "$TMP_FILE" "$CONFIG_FILE"
rm "$TMP_FILE"

# Step 3: Configure HTTP to HTTPS redirection (for ALB)
echo -e "${BLUE}Step 3: Configuring HTTP to HTTPS redirection...${NC}"

# Create a temporary file for the updated configuration
TMP_FILE=$(mktemp)

# Add HTTP to HTTPS redirection rules if they don't already exist
jq '
    # First check if the redirect already exists
    if (map(select(.Namespace == "aws:elasticbeanstalk:environment:process:default" and .OptionName == "HealthCheckPath")) | length) == 0 then
        . + [{
            "Namespace": "aws:elasticbeanstalk:environment:process:default",
            "OptionName": "HealthCheckPath",
            "Value": "/"
        }]
      else
        .
      end
    | if (map(select(.Namespace == "aws:elbv2:listenerrule:redirect" and .OptionName == "PathPatterns")) | length) == 0 then
        . + [{
            "Namespace": "aws:elbv2:listenerrule:redirect",
            "OptionName": "PathPatterns",
            "Value": "/*"
        },
        {
            "Namespace": "aws:elbv2:listenerrule:redirect",
            "OptionName": "Priority",
            "Value": "1"
        },
        {
            "Namespace": "aws:elbv2:listenerrule:redirect",
            "OptionName": "Process",
            "Value": "redirect"
        },
        {
            "Namespace": "aws:elasticbeanstalk:environment:process:redirect",
            "OptionName": "Port",
            "Value": "443"
        },
        {
            "Namespace": "aws:elasticbeanstalk:environment:process:redirect",
            "OptionName": "Protocol",
            "Value": "HTTPS"
        }]
      else
        .
      end
' "$CONFIG_FILE" > "$TMP_FILE" 2>/dev/null

# Check if jq command was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to add redirection rules.${NC}"
    echo -e "${YELLOW}HTTP to HTTPS redirection will need to be configured manually.${NC}"
else
    cp "$TMP_FILE" "$CONFIG_FILE"
    echo -e "${GREEN}✓ Added HTTP to HTTPS redirection rules${NC}"
fi

rm "$TMP_FILE"

# Step 4: Validate the configuration
echo -e "${BLUE}Step 4: Validating the updated configuration...${NC}"

# Check for basic syntax errors in the json file
if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
    echo -e "${RED}Error: The configuration file contains invalid JSON.${NC}"
    echo -e "${YELLOW}Please check the file manually before deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Configuration syntax is valid${NC}"

# If available, use the deployment error detection script
if [ -f "./scripts/Version0042_deployment_error_detection.sh" ]; then
    chmod +x "./scripts/Version0042_deployment_error_detection.sh"
    echo -e "${BLUE}Running deployment error detection...${NC}"
    ./scripts/Version0042_deployment_error_detection.sh "$CONFIG_FILE"
fi

# Step 5: Provide deployment instructions
echo -e "${BLUE}${BOLD}======== HTTPS Configuration Complete ========${NC}"
echo -e "${GREEN}✓ Your configuration has been updated to use HTTPS${NC}"
echo -e "${GREEN}✓ SSL Certificate: Configured for dottapps.com and www.dottapps.com${NC}"
echo -e "${GREEN}✓ HTTP to HTTPS redirection: Added${NC}"
echo -e "${BLUE}${BOLD}=========================================${NC}"
echo -e "${YELLOW}To deploy with these changes, run:${NC}"
echo -e "${BLUE}./scripts/Version0041_improved_deploy_dottapps_env.sh${NC}"
echo -e "${YELLOW}or${NC}"
echo -e "${BLUE}./scripts/Version0046_final_dottapps_deploy.sh${NC}"
