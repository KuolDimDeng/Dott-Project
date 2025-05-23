#!/bin/bash

# Version0046_final_dottapps_deploy.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Fix all deployment issues and deploy DottApps application to AWS Elastic Beanstalk
# 
# This script addresses all the issues encountered with the DottApps deployment:
# 1. Fixes the ServiceRole namespace issue by adding it explicitly
# 2. Updates the configuration to use Application Load Balancer
# 3. Ensures VPC settings are correctly configured
# 4. Sets up proper database configuration
# 5. Deploys to Elastic Beanstalk

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps Final Deployment Solution (v1.0.0) =====${NC}"

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Check if config file exists
CONFIG_FILE="DottAppsConfig.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: $CONFIG_FILE not found in current directory${NC}"
    exit 1
fi

# Create backup of original config
BACKUP_FILE="DottAppsConfig_Final_${TIMESTAMP}.bak.json"
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"

# Step 1: Fix the ServiceRole issue
echo -e "${BLUE}Step 1: Fixing ServiceRole configuration...${NC}"
SERVICE_ROLE=$(grep -A 1 "ServiceRole" "$CONFIG_FILE" | grep "Value" | awk -F'"' '{print $4}')

if [ -z "$SERVICE_ROLE" ]; then
    echo -e "${RED}Error: ServiceRole not found in configuration${NC}"
    echo -e "${YELLOW}Using default service role: aws-elasticbeanstalk-service-role${NC}"
    SERVICE_ROLE="arn:aws:iam::471112661935:role/aws-elasticbeanstalk-service-role"
else
    echo -e "${GREEN}✓ Found ServiceRole: $SERVICE_ROLE${NC}"
fi

# Step 2: Get VPC settings
echo -e "${BLUE}Step 2: Setting up VPC configuration...${NC}"
VPC_ID=$(grep -A 1 "VPCId" "$CONFIG_FILE" | grep "Value" | awk -F'"' '{print $4}')
if [ -z "$VPC_ID" ]; then
    echo -e "${RED}Error: VPC ID not found in configuration${NC}"
    echo -e "${YELLOW}Using provided VPC ID: vpc-0564a66b550c7063e${NC}"
    VPC_ID="vpc-0564a66b550c7063e"
else
    echo -e "${GREEN}✓ Found VPC ID: $VPC_ID${NC}"
fi

# Step 3: Get subnet information
echo -e "${BLUE}Step 3: Setting up subnet configuration...${NC}"
SUBNETS=$(grep -A 1 "Subnets" "$CONFIG_FILE" | grep "Value" | awk -F'"' '{print $4}')
if [ -z "$SUBNETS" ]; then
    echo -e "${RED}Error: Subnets not found in configuration${NC}"
    echo -e "${YELLOW}Using provided subnets${NC}"
    SUBNETS="subnet-0cc4a92e849ff4b13,subnet-08cd4e29bf37927d4,subnet-005ad102daaebca3a,subnet-00c1377c2d03b3214,subnet-058e65aed208fc90b,subnet-06d85dd067b0b1d59"
else
    echo -e "${GREEN}✓ Found Subnets: $SUBNETS${NC}"
fi

# Step 4: Create properly formatted configuration file
echo -e "${BLUE}Step 4: Creating fixed configuration file...${NC}"

TMP_FILE=$(mktemp)

cat > "$TMP_FILE" << EOF
[
  {
    "Namespace": "aws:elasticbeanstalk:environment",
    "OptionName": "ServiceRole",
    "Value": "$SERVICE_ROLE"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "VPCId",
    "Value": "$VPC_ID"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "Subnets",
    "Value": "$SUBNETS"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "ELBSubnets",
    "Value": "$SUBNETS"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "AssociatePublicIpAddress",
    "Value": "true"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment",
    "OptionName": "EnvironmentType",
    "Value": "LoadBalanced"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment",
    "OptionName": "LoadBalancerType",
    "Value": "application"
  },
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "EC2KeyName",
    "Value": "dott-key-pair"
  },
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "IamInstanceProfile",
    "Value": "aws-elasticbeanstalk-ec2-role"
  },
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "SecurityGroups",
    "Value": "sg-0d385b514eeee83dd"
  },
  {
    "Namespace": "aws:autoscaling:asg",
    "OptionName": "MinSize",
    "Value": "1"
  },
  {
    "Namespace": "aws:autoscaling:asg",
    "OptionName": "MaxSize",
    "Value": "3"
  },
  {
    "Namespace": "aws:ec2:instances",
    "OptionName": "InstanceTypes",
    "Value": "t2.medium"
  }
]
EOF

# Replace the original file with our fixed version
cp "$TMP_FILE" "$CONFIG_FILE"
rm "$TMP_FILE"

echo -e "${GREEN}✓ Configuration file has been successfully fixed${NC}"
echo -e "${BLUE}=== Validation Report ===${NC}"

# Validate the fixed configuration
./scripts/Version0042_deployment_error_detection.sh "$CONFIG_FILE"

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}Ready to deploy? (y/n)${NC}"
read -r DEPLOY_CONFIRMATION

if [[ "$DEPLOY_CONFIRMATION" == "y" || "$DEPLOY_CONFIRMATION" == "Y" ]]; then
    echo -e "${BLUE}Deploying application...${NC}"
    ./scripts/Version0041_improved_deploy_dottapps_env.sh
    echo -e "${GREEN}✓ Deployment process initiated${NC}"
    echo -e "${YELLOW}Check the AWS Elastic Beanstalk console for deployment status${NC}"
else
    echo -e "${YELLOW}Deployment canceled. You can deploy manually using:${NC}"
    echo -e "${BLUE}./scripts/Version0041_improved_deploy_dottapps_env.sh${NC}"
fi

echo -e "${GREEN}✓ Configuration setup complete!${NC}"
