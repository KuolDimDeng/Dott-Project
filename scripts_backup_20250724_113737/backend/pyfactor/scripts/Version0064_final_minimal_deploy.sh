#!/bin/bash

# Version0064_final_minimal_deploy.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Create a final simplified deployment approach with syntax fixes

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps Final Minimal Deployment Solution (v1.0.0) =====${NC}"

# Ensure we're in the backend/pyfactor directory
if [[ "$PWD" != *"backend/pyfactor" ]]; then
    echo -e "${YELLOW}Changing to the backend/pyfactor directory...${NC}"
    cd "/Users/kuoldeng/projectx/backend/pyfactor" || {
        echo -e "${RED}Error: Cannot change to /Users/kuoldeng/projectx/backend/pyfactor${NC}"
        exit 1
    }
fi

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory if it doesn't exist
BACKUP_DIR="configuration_backups"
mkdir -p "$BACKUP_DIR"

# Check if previous config exists and back it up
CONFIG_FILE="DottAppsConfig.json"
if [ -f "$CONFIG_FILE" ]; then
    BACKUP_FILE="$BACKUP_DIR/DottAppsConfig_Final_$TIMESTAMP.bak.json"
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"
fi

# Get AWS account info
echo -e "${BLUE}Setting up minimal configuration parameters...${NC}"
SERVICE_ROLE="arn:aws:iam::471112661935:role/aws-elasticbeanstalk-service-role"
EC2_PROFILE="aws-elasticbeanstalk-ec2-role"
VPC_ID="vpc-0564a66b550c7063e"
SUBNETS="subnet-0cc4a92e849ff4b13,subnet-08cd4e29bf37927d4,subnet-005ad102daaebca3a,subnet-00c1377c2d03b3214,subnet-058e65aed208fc90b,subnet-06d85dd067b0b1d59"
SECURITY_GROUP="sg-0d385b514eeee83dd"

echo -e "${YELLOW}→ Using ServiceRole: $SERVICE_ROLE${NC}"
echo -e "${YELLOW}→ Using EC2 Instance Profile: $EC2_PROFILE${NC}"
echo -e "${YELLOW}→ Using VPC: $VPC_ID${NC}"

# Create a minimal configuration file with no HTTPS or SSL
echo -e "${BLUE}Creating minimal configuration file...${NC}"
cat > "$CONFIG_FILE" << EOL
[
  {
    "Namespace": "aws:elasticbeanstalk:environment",
    "OptionName": "ServiceRole",
    "Value": "${SERVICE_ROLE}"
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
    "Value": "${EC2_PROFILE}"
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
    "Value": "${VPC_ID}"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "AssociatePublicIpAddress",
    "Value": "true"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "Subnets",
    "Value": "${SUBNETS}"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "ELBSubnets",
    "Value": "${SUBNETS}"
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
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "SecurityGroups",
    "Value": "${SECURITY_GROUP}"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "DJANGO_SETTINGS_MODULE",
    "Value": "pyfactor.settings_eb"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "ENVIRONMENT",
    "Value": "production"
  },
  {
    "Namespace": "aws:elasticbeanstalk:healthreporting:system",
    "OptionName": "SystemType",
    "Value": "enhanced"
  }
]
EOL

echo -e "${GREEN}✓ Created minimal configuration file${NC}"

# Check for deployment packages
echo -e "${BLUE}Checking for deployment packages...${NC}"
PACKAGES=($(find . -maxdepth 1 -name "*.zip" -type f | sort -r))

if [ ${#PACKAGES[@]} -eq 0 ]; then
    echo -e "${RED}Error: No ZIP packages found. Deployment cannot proceed.${NC}"
    exit 1
else
    echo -e "${GREEN}Found ${#PACKAGES[@]} packages.${NC}"
fi

# List the packages
for i in "${!PACKAGES[@]}"; do
    FILE=${PACKAGES[$i]}
    SIZE=$(du -h "$FILE" | cut -f1)
    MODIFIED=$(stat -f "%Sm" "$FILE")
    echo -e "$i) $(basename "$FILE") ($SIZE, modified $MODIFIED)"
done

LATEST=${PACKAGES[0]}
LATEST_BASENAME=$(basename "$LATEST")
echo -e "${YELLOW}Recommend using the most recent package: $LATEST_BASENAME${NC}"

echo -e "${BLUE}Do you want to run the deployment with the minimal configuration? (y/n)${NC}"
read -r RUN_DEPLOY

if [[ "$RUN_DEPLOY" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Starting deployment with package $LATEST_BASENAME...${NC}"
    
    APP_NAME="DottApps"
    ENV_NAME="DottApps-env"
    VERSION_LABEL="V$(date +"%Y%m%d%H%M%S")"
    S3_BUCKET="dott-app-deployments-dockerebmanual001"
    S3_KEY="dottapps-$LATEST_BASENAME"
    
    echo -e "${BLUE}======== SIMPLIFIED DEPLOYMENT: DOTT APPS ========${NC}"
    echo -e "${BLUE}Deploying application: $APP_NAME${NC}"
    echo -e "${BLUE}Environment: $ENV_NAME${NC}"
    echo -e "${BLUE}Version: $VERSION_LABEL${NC}"
    echo -e "${BLUE}Package: $LATEST_BASENAME${NC}"
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}Error: AWS CLI not found${NC}"
        exit 1
    fi
    
    # Upload to S3
    echo -e "${BLUE}Uploading package to S3...${NC}"
    aws s3 cp "$LATEST" "s3://$S3_BUCKET/$S3_KEY"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to upload package to S3${NC}"
        exit 1
    fi
    echo -e "${GREEN}Package uploaded successfully!${NC}"
    
    # Create application version
    echo -e "${BLUE}Creating application version from S3...${NC}"
    echo -e "${YELLOW}NOTE: This script uses the no-process flag${NC}"
    
    # Fixed AWS CLI command - note the proper syntax for no-process
    aws elasticbeanstalk create-application-version \
        --application-name "$APP_NAME" \
        --version-label "$VERSION_LABEL" \
        --description "DottApps deployment package" \
        --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" \
        --no-process
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to create application version${NC}"
        exit 1
    fi
    echo -e "${GREEN}Application version created successfully!${NC}"
    
    # Check if environment exists
    echo -e "${BLUE}Checking if environment exists...${NC}"
    ENV_EXISTS=$(aws elasticbeanstalk describe-environments --application-name "$APP_NAME" --environment-names "$ENV_NAME" --query "Environments[].EnvironmentName" --output text)
    
    if [ -z "$ENV_EXISTS" ]; then
        echo -e "${YELLOW}Environment does not exist. Creating new environment...${NC}"
        
        # Create the environment with minimal configuration
        aws elasticbeanstalk create-environment \
            --application-name "$APP_NAME" \
            --environment-name "$ENV_NAME" \
            --version-label "$VERSION_LABEL" \
            --option-settings file://"$CONFIG_FILE"
        
        CREATE_RESULT=$?
        if [ $CREATE_RESULT -ne 0 ]; then
            echo -e "${RED}Error: Environment creation failed${NC}"
            echo -e "${YELLOW}Configuration saved locally as $CONFIG_FILE for future use${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}Environment creation initiated successfully!${NC}"
    else
        echo -e "${YELLOW}Environment already exists. Updating environment...${NC}"
        
        # Update existing environment
        aws elasticbeanstalk update-environment \
            --environment-name "$ENV_NAME" \
            --version-label "$VERSION_LABEL" \
            --option-settings file://"$CONFIG_FILE"
        
        UPDATE_RESULT=$?
        if [ $UPDATE_RESULT -ne 0 ]; then
            echo -e "${RED}Error: Environment update failed${NC}"
            echo -e "${YELLOW}Configuration saved locally as $CONFIG_FILE for future use${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}Environment update initiated successfully!${NC}"
    fi
    
    # Monitor deployment
    echo -e "${BLUE}Waiting for deployment to complete...${NC}"
    echo -e "${YELLOW}This may take 5-10 minutes. Please be patient.${NC}"
    echo -e "${YELLOW}You can check the status in the AWS Elastic Beanstalk console.${NC}"
    echo -e "${YELLOW}URL: https://$ENV_NAME.us-east-1.elasticbeanstalk.com${NC}"
    
    # Wait for deployment to complete
    MAX_RETRIES=30
    RETRY_COUNT=0
    RETRY_DELAY=60
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        CURRENT_STATUS=$(aws elasticbeanstalk describe-environments --environment-names "$ENV_NAME" --query "Environments[0].Status" --output text)
        CURRENT_HEALTH=$(aws elasticbeanstalk describe-environments --environment-names "$ENV_NAME" --query "Environments[0].Health" --output text)
        
        echo -e "Current status: $CURRENT_STATUS, Health: $CURRENT_HEALTH"
        
        if [ "$CURRENT_STATUS" == "Ready" ]; then
            echo -e "${GREEN}Deployment completed successfully!${NC}"
            break
        fi
        
        sleep $RETRY_DELAY
        RETRY_COUNT=$((RETRY_COUNT + 1))
    done
    
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo -e "${YELLOW}======== DEPLOYMENT INCOMPLETE ========${NC}"
        echo -e "${YELLOW}The deployment did not complete within the expected time.${NC}"
        echo -e "${YELLOW}Check the AWS Elastic Beanstalk console for more information.${NC}"
        echo -e "${YELLOW}==========================================${NC}"
    else
        # Get environment URL
        ENV_URL=$(aws elasticbeanstalk describe-environments --environment-names "$ENV_NAME" --query "Environments[0].CNAME" --output text)
        
        echo -e "${GREEN}======== DEPLOYMENT COMPLETE ========${NC}"
        echo -e "${GREEN}Application: $APP_NAME${NC}"
        echo -e "${GREEN}Environment: $ENV_NAME${NC}"
        echo -e "${GREEN}Status: $CURRENT_STATUS${NC}"
        echo -e "${GREEN}Health: $CURRENT_HEALTH${NC}"
        echo -e "${GREEN}Version: $VERSION_LABEL${NC}"
        echo -e "${GREEN}URL: https://$ENV_URL${NC}"
        echo -e "${GREEN}Configuration saved as: $CONFIG_FILE${NC}"
        echo -e "${GREEN}=====================================${NC}"
    fi
    
    # Suggest next steps
    echo -e "${BLUE}======== NEXT STEPS ========${NC}"
    echo -e "${YELLOW}1. To add RDS database support:${NC}"
    echo -e "${YELLOW}   ./scripts/Version0061_fix_config_and_postgres.sh${NC}"
    echo -e "${YELLOW}2. To add HTTPS support:${NC}"
    echo -e "${YELLOW}   ./scripts/Version0055_add_ssl_certificate.sh${NC}"
    echo -e "${YELLOW}3. To check the deployment status:${NC}"
    echo -e "${YELLOW}   aws elasticbeanstalk describe-environments --environment-names \"$ENV_NAME\" --query \"Environments[0].[Status,Health]\" --output text${NC}"
    echo -e "${BLUE}============================${NC}"
else
    echo -e "${YELLOW}Deployment cancelled. You can run this script again when ready.${NC}"
    echo -e "${YELLOW}The minimal configuration has been saved to $CONFIG_FILE for future use.${NC}"
fi

exit 0
