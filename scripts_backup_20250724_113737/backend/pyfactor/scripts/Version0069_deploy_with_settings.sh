#!/bin/bash

# Version0069_deploy_with_settings.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Deploy DottApps to AWS Elastic Beanstalk using the optimized package with settings_eb.py

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}======== AWS CLI DEPLOYMENT: DOTT APPS WITH SETTINGS MODULE ========${NC}"
echo -e "Deploying application: DottApps"
echo -e "Environment: DottApps-env"
echo -e "Version: V$(date +%Y%m%d%H%M%S)"
echo -e "Instance Type: t2.small"
echo -e "Configuration: Optimized with settings_eb.py"

# Check if AWS CLI is installed and configured
echo -e "${YELLOW}Checking AWS CLI installation...${NC}"
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check architecture and use appropriate solution stack
ARCH=$(uname -m)
echo -e "${YELLOW}Checking system architecture: ${ARCH}${NC}"

if [[ "$ARCH" == "arm64" ]]; then
    echo -e "${YELLOW}Apple Silicon (M1/M2/M3/M4) detected.${NC}"
else
    echo -e "${YELLOW}Intel architecture detected.${NC}"
fi

AWS_CLI_PATH=$(which aws)
echo -e "${YELLOW}AWS CLI found at: ${AWS_CLI_PATH}${NC}"
AWS_CLI_VERSION=$(aws --version)
echo -e "${YELLOW}Using AWS CLI: ${AWS_CLI_VERSION}${NC}"

# Find the newest optimized package with settings
PACKAGE_PATH=$(ls -t eb-package-with-settings-*.zip | head -n 1)
if [ -z "$PACKAGE_PATH" ]; then
    echo -e "${RED}No package found. Please run Version0068_create_eb_package_with_settings.sh first.${NC}"
    exit 1
fi

PACKAGE_SIZE=$(du -h "$PACKAGE_PATH" | cut -f1)
echo -e "${GREEN}Using optimized package: ${PACKAGE_PATH} (${PACKAGE_SIZE})${NC}"

# Create S3 bucket name based on account ID (or use existing one)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
S3_BUCKET="dott-app-deployments-dockerebmanual001"

# Upload package to S3
echo -e "${YELLOW}Uploading package to S3...${NC}"
S3_KEY="dottapps-settings-$(basename "$PACKAGE_PATH")"
aws s3 cp "$PACKAGE_PATH" "s3://${S3_BUCKET}/${S3_KEY}"

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to upload package to S3. Check your AWS credentials and S3 bucket permissions.${NC}"
    exit 1
fi
echo -e "${GREEN}Package uploaded successfully!${NC}"

# Create application version
VERSION_LABEL="V$(date +%Y%m%d%H%M%S)"
echo -e "${YELLOW}Creating application version from S3...${NC}"
echo -e "${YELLOW}NOTE: Creating application version${NC}"

aws elasticbeanstalk create-application-version \
    --application-name DottApps \
    --version-label "$VERSION_LABEL" \
    --description "DottApps deployment package" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" \
    --no-process

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create application version. Check if application exists or create it first.${NC}"
    exit 1
fi
echo -e "${GREEN}Application version created successfully!${NC}"

# Check if environment exists
echo -e "${YELLOW}Checking if environment exists...${NC}"
ENV_EXISTS=$(aws elasticbeanstalk describe-environments --environment-names DottApps-env --query "Environments[?Status!='Terminated'].EnvironmentName" --output text)

# Get the latest solution stack
SOLUTION_STACK=$(aws elasticbeanstalk list-available-solution-stacks | grep -i "Docker" | head -1 | sed 's/.*"\(.*\)".*/\1/')
echo -e "${YELLOW}Using solution stack: ${SOLUTION_STACK}${NC}"

# Prepare configuration options file - minimal configuration
CONFIG_FILE="minimal-settings-config.json"
cat > "$CONFIG_FILE" << EOF
[
  {
    "Namespace": "aws:elasticbeanstalk:environment",
    "OptionName": "ServiceRole",
    "Value": "arn:aws:iam::471112661935:role/aws-elasticbeanstalk-service-role"
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
    "OptionName": "IamInstanceProfile",
    "Value": "aws-elasticbeanstalk-ec2-role"
  },
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "InstanceType",
    "Value": "t2.small"
  },
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "EC2KeyName",
    "Value": "dott-key-pair"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "VPCId",
    "Value": "vpc-0564a66b550c7063e"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "AssociatePublicIpAddress",
    "Value": "true"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "Subnets",
    "Value": "subnet-0cc4a92e849ff4b13,subnet-08cd4e29bf37927d4,subnet-005ad102daaebca3a,subnet-00c1377c2d03b3214,subnet-058e65aed208fc90b,subnet-06d85dd067b0b1d59"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "ELBSubnets",
    "Value": "subnet-005ad102daaebca3a,subnet-00c1377c2d03b3214,subnet-058e65aed208fc90b,subnet-06d85dd067b0b1d59,subnet-08cd4e29bf37927d4,subnet-0cc4a92e849ff4b13"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "DJANGO_SETTINGS_MODULE",
    "Value": "pyfactor.settings_eb"
  }
]
EOF

# Create or update environment
if [ -z "$ENV_EXISTS" ]; then
    echo -e "${YELLOW}Environment does not exist. Creating new environment...${NC}"
    aws elasticbeanstalk create-environment \
        --application-name DottApps \
        --environment-name DottApps-env \
        --solution-stack-name "$SOLUTION_STACK" \
        --option-settings file://"$CONFIG_FILE" \
        --version-label "$VERSION_LABEL"
else
    echo -e "${YELLOW}Environment exists. Updating environment...${NC}"
    aws elasticbeanstalk update-environment \
        --environment-name DottApps-env \
        --option-settings file://"$CONFIG_FILE" \
        --version-label "$VERSION_LABEL"
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create/update environment. Check the AWS Elastic Beanstalk console for more information.${NC}"
    # Save config for future use
    echo -e "${YELLOW}Configuration saved locally as $CONFIG_FILE for future use${NC}"
    exit 1
fi

echo -e "${GREEN}Environment creation/update initiated successfully!${NC}"
echo -e "${YELLOW}Waiting for deployment to complete...${NC}"
echo -e "${YELLOW}This may take 5-10 minutes. Please be patient.${NC}"
echo -e "${YELLOW}You can check the status in the AWS Elastic Beanstalk console.${NC}"
echo -e "${YELLOW}URL: https://DottApps-env.us-east-1.elasticbeanstalk.com${NC}"

# Monitor deployment status
MAX_ATTEMPTS=30
ATTEMPTS=0
DEPLOYMENT_SUCCESS=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    ENVIRONMENT_INFO=$(aws elasticbeanstalk describe-environments --environment-names DottApps-env --query "Environments[0].[Status,Health]" --output text)
    STATUS=$(echo "$ENVIRONMENT_INFO" | cut -f1)
    HEALTH=$(echo "$ENVIRONMENT_INFO" | cut -f2)
    
    echo -e "${YELLOW}Current status: ${STATUS}, Health: ${HEALTH}${NC}"
    
    if [[ "$STATUS" == "Ready" && "$HEALTH" == "Green" ]]; then
        DEPLOYMENT_SUCCESS=true
        break
    elif [[ "$STATUS" == "Terminated" ]]; then
        echo -e "${RED}Deployment failed. Environment was terminated.${NC}"
        break
    fi
    
    ATTEMPTS=$((ATTEMPTS+1))
    sleep 20
done

if [ "$DEPLOYMENT_SUCCESS" = true ]; then
    echo -e "${GREEN}======== DEPLOYMENT COMPLETE ========${NC}"
    echo -e "Application: DottApps"
    echo -e "Environment: DottApps-env"
    echo -e "Status: $STATUS"
    echo -e "Health: $HEALTH"
    echo -e "Version: $VERSION_LABEL"
    echo -e "URL: https://DottApps-env.us-east-1.elasticbeanstalk.com"
    echo -e "Configuration saved as: $CONFIG_FILE"
    echo -e "${GREEN}=====================================${NC}"
else
    echo -e "${RED}======== DEPLOYMENT INCOMPLETE ========${NC}"
    echo -e "The deployment did not complete successfully within the expected time."
    echo -e "Check the AWS Elastic Beanstalk console for more information."
    echo -e "${RED}=========================================${NC}"
fi
