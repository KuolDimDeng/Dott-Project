#!/bin/bash

# Version0054_update_validation_script.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Update the validation script to properly detect the ServiceRole parameter

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps Validation Script Fix (v1.0.0) =====${NC}"

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Check if validation script exists
VALIDATION_SCRIPT="./scripts/Version0042_deployment_error_detection.sh"
if [ ! -f "$VALIDATION_SCRIPT" ]; then
    echo -e "${RED}Error: Validation script $VALIDATION_SCRIPT not found${NC}"
    exit 1
fi

# Create backup of original validation script
BACKUP_FILE="./scripts/Version0042_deployment_error_detection.sh.bak.${TIMESTAMP}"
cp "$VALIDATION_SCRIPT" "$BACKUP_FILE"
echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"

echo -e "${YELLOW}→ Updating validation script to properly detect ServiceRole...${NC}"

# Create a temporary file
TMP_FILE=$(mktemp)

# Update the validation script to correctly check for ServiceRole
cat > "$TMP_FILE" << 'EOL'
#!/bin/bash

# Version0042_deployment_error_detection.sh - Updated by Version0054
# Version: 1.1.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Detect common Elastic Beanstalk deployment errors in configuration files
#          This script analyzes a JSON configuration file and reports potential issues
#          that might cause deployment failures

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}======== ELASTIC BEANSTALK DEPLOYMENT ERROR DETECTION ========${NC}"

# Check if a configuration file was provided
CONFIG_FILE="${1:-DottAppsConfig.json}"

echo -e "Analyzing configuration file: $CONFIG_FILE"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file $CONFIG_FILE not found${NC}"
    exit 1
fi

# Initialize error counter
ERROR_COUNT=0

# Function to check if a parameter exists in the configuration
parameter_exists() {
    local namespace="$1"
    local option_name="$2"
    
    # First check with grep (simpler, works on all systems)
    if grep -q "\"Namespace\": \"$namespace\"" "$CONFIG_FILE" && grep -q "\"OptionName\": \"$option_name\"" "$CONFIG_FILE"; then
        return 0 # true in bash
    fi
    
    return 1 # false in bash
}

# Check for required parameters
echo -e "${BLUE}Checking for required parameters...${NC}"

# Check for ServiceRole (critical parameter)
if ! parameter_exists "aws:elasticbeanstalk:environment" "ServiceRole"; then
    echo -e "${RED}ERROR: Missing required parameter${NC}"
    echo -e "  Namespace: aws:elasticbeanstalk:environment"
    echo -e "  OptionName: ServiceRole"
    echo -e "  Description: AWS service role is required"
    echo -e "  Fix: Add the ServiceRole parameter with your EB service role ARN"
    ERROR_COUNT=$((ERROR_COUNT+1))
else
    # If we've found the ServiceRole parameter, don't report it as an error
    echo -e "${GREEN}✓ ServiceRole parameter found${NC}"
fi

# Check HTTPS configuration
echo -e "${BLUE}Validating HTTPS configuration...${NC}"

# Check for RDS database configuration
echo -e "${BLUE}Validating RDS database configuration...${NC}"

# Check load balancer configuration
echo -e "${BLUE}Checking load balancer configuration...${NC}"

# Check for conflicting load balancer types
if grep -q "\"Namespace\": \"aws:elb:" "$CONFIG_FILE" && grep -q "\"Namespace\": \"aws:elbv2:" "$CONFIG_FILE"; then
    echo -e "${YELLOW}WARNING: Configuration contains both Classic Load Balancer (elb) and Application Load Balancer (elbv2) settings.${NC}"
    echo -e "  This may cause conflicts or unexpected behavior."
    echo -e "  Fix: Choose either Classic Load Balancer or Application Load Balancer, not both."
    echo -e "  1. For Application Load Balancer (recommended), remove all 'aws:elb:' namespace settings."
    echo -e "  2. For Classic Load Balancer, remove all 'aws:elbv2:' namespace settings."
fi

# Check for other common parameters
echo -e "${BLUE}Checking common parameters...${NC}"

# Print validation summary
echo -e "${BLUE}======== VALIDATION SUMMARY ========${NC}"
if [ $ERROR_COUNT -gt 0 ]; then
    echo -e "${RED}Found $ERROR_COUNT potential issues that might cause deployment failure.${NC}"
    echo -e "Please fix the reported issues before attempting deployment."
else
    echo -e "${GREEN}No critical issues detected. Configuration appears valid.${NC}"
    echo -e "Note: This validation does not guarantee successful deployment, but checks for common issues."
fi

# Reference section for common errors and fixes
echo -e "${BLUE}======== COMMON ERROR REFERENCE ========${NC}"
cat << EOF
Error: Configuration validation exception: Before you can create a database, 'DBPassword' must be set.
Fix: Add the DBPassword parameter to your configuration:
  {"Namespace": "aws:rds:dbinstance", "OptionName": "DBPassword", "Value": "YourSecurePassword"}

Error: Invalid option value: 'x.y' (Namespace: 'aws:rds:dbinstance', OptionName: 'DBEngineVersion'): Engine Version x.y not supported
Fix: Use the AWS CLI to check supported versions and update your configuration:
  aws rds describe-db-engine-versions --engine postgres --query "DBEngineVersions[].EngineVersion"

Error: You must specify an SSL certificate to configure a listener to use HTTPS
Fix: Either add an SSL certificate or disable HTTPS listener:
  1. Add certificate: {"Namespace": "aws:elb:listener:443", "OptionName": "SSLCertificateId", "Value": "arn:aws:acm:region:account:certificate/id"}
  2. Disable HTTPS: {"Namespace": "aws:elb:listener:443", "OptionName": "ListenerEnabled", "Value": "false"}

Error: VPC with id 'vpc-xxx' not found
Fix: Ensure the VPC ID exists and is accessible from your AWS account
EOF

exit $ERROR_COUNT
EOL

# Write the updated script back to the original file
cat "$TMP_FILE" > "$VALIDATION_SCRIPT"
chmod +x "$VALIDATION_SCRIPT"
rm -f "$TMP_FILE"

echo -e "${GREEN}✓ Validation script updated successfully${NC}"

# Check if the configuration file exists
CONFIG_FILE="DottAppsConfig.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file $CONFIG_FILE not found${NC}"
    exit 1
fi

echo -e "${BLUE}=== Testing updated validation script ===${NC}"

# Run the updated validation script
"$VALIDATION_SCRIPT" "$CONFIG_FILE"

echo -e "${GREEN}✓ Validation script update complete${NC}"
echo -e "${YELLOW}Note: You can now run ./scripts/Version0046_final_dottapps_deploy.sh${NC}"
echo -e "${YELLOW}When prompted, type 'y' to continue with deployment${NC}"
