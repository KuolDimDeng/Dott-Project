#!/bin/bash

# Version0063_finalize_minimal_deployment.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Create a simplified deployment approach that ensures proper directory usage

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps Simplified Deployment Solution (v1.0.0) =====${NC}"

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
    BACKUP_FILE="$BACKUP_DIR/DottAppsConfig_Simplified_$TIMESTAMP.bak.json"
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
POSTGRES_VERSION="13.16"

echo -e "${YELLOW}→ Using ServiceRole: $SERVICE_ROLE${NC}"
echo -e "${YELLOW}→ Using EC2 Instance Profile: $EC2_PROFILE${NC}"
echo -e "${YELLOW}→ Using VPC: $VPC_ID${NC}"
echo -e "${YELLOW}→ Using PostgreSQL version: $POSTGRES_VERSION${NC}"

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
PACKAGES=($(find . -maxdepth 1 -name "*docker-eb-package*.zip" -type f | sort -r))

if [ ${#PACKAGES[@]} -eq 0 ]; then
    echo -e "${RED}Error: No deployment packages found${NC}"
    PACKAGES=($(find . -maxdepth 1 -name "*.zip" -type f | sort -r))
    
    if [ ${#PACKAGES[@]} -eq 0 ]; then
        echo -e "${RED}Error: No ZIP packages found at all. Deployment cannot proceed.${NC}"
        exit 1
    else
        echo -e "${YELLOW}Found ${#PACKAGES[@]} general ZIP packages. These may not be suitable for deployment.${NC}"
    fi
else
    echo -e "${GREEN}Found ${#PACKAGES[@]} deployment packages.${NC}"
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
    echo -e "${YELLOW}NOTE: This script bypasses size limits by setting process to false${NC}"
    aws elasticbeanstalk create-application-version \
        --application-name "$APP_NAME" \
        --version-label "$VERSION_LABEL" \
        --description "DottApps deployment package" \
        --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" \
        --process="false"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to create application version${NC}"
        exit 1
    fi
    echo -e "${GREEN}Application version created successfully!${NC}"
    
    # Check if environment exists
    echo -e "${BLUE}Checking if environment exists...${NC}"
    ENV_EXISTS=$(aws elasticbeanstalk describe-environments --application-name "$APP_NAME" --environment-names "$ENV_NAME" --include-deleted=false 2>/dev/null)
    ENV_STATUS=$(echo "$ENV_EXISTS" | grep "\"Status\"" | head -1 | awk -F'"' '{print $4}')
    
    if [ -z "$ENV_STATUS" ]; then
        echo -e "${YELLOW}Environment does not exist. Creating new environment...${NC}"
        
        # Create environment with options file
        aws elasticbeanstalk create-environment \
            --application-name "$APP_NAME" \
            --environment-name "$ENV_NAME" \
            --version-label "$VERSION_LABEL" \
            --option-settings file://"$CONFIG_FILE"
            
        DEPLOY_RESULT=$?
        if [ $DEPLOY_RESULT -ne 0 ]; then
            echo -e "${RED}Error creating environment${NC}"
            echo -e "${YELLOW}Configuration saved locally as $CONFIG_FILE for future use${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}Environment creation initiated successfully!${NC}"
    else
        echo -e "${YELLOW}Environment exists with status: $ENV_STATUS${NC}"
        
        # Update existing environment
        aws elasticbeanstalk update-environment \
            --application-name "$APP_NAME" \
            --environment-name "$ENV_NAME" \
            --version-label "$VERSION_LABEL" \
            --option-settings file://"$CONFIG_FILE"
            
        DEPLOY_RESULT=$?
        if [ $DEPLOY_RESULT -ne 0 ]; then
            echo -e "${RED}Error updating environment${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}Environment update initiated successfully!${NC}"
    fi
    
    # Monitor deployment
    echo -e "${BLUE}Waiting for deployment to complete...${NC}"
    echo -e "${YELLOW}This may take 5-10 minutes. Please be patient.${NC}"
    echo -e "${YELLOW}You can check the status in the AWS Elastic Beanstalk console.${NC}"
    echo -e "${BLUE}URL: https://$ENV_NAME.us-east-1.elasticbeanstalk.com${NC}"
    
    # Wait for deployment to complete
    MAX_ATTEMPTS=30
    ATTEMPT=0
    PREV_STATUS=""
    PREV_HEALTH=""
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        sleep 20
        ENV_INFO=$(aws elasticbeanstalk describe-environments --application-name "$APP_NAME" --environment-names "$ENV_NAME" 2>/dev/null)
        if [ $? -ne 0 ]; then
            echo -e "${RED}Error: Failed to get environment status${NC}"
            break
        fi
        
        STATUS=$(echo "$ENV_INFO" | grep "\"Status\"" | head -1 | awk -F'"' '{print $4}')
        HEALTH=$(echo "$ENV_INFO" | grep "\"Health\"" | head -1 | awk -F'"' '{print $4}')
        
        if [ "$STATUS" != "$PREV_STATUS" ] || [ "$HEALTH" != "$PREV_HEALTH" ]; then
            echo -e "${BLUE}Current status: $STATUS, Health: $HEALTH${NC}"
            PREV_STATUS=$STATUS
            PREV_HEALTH=$HEALTH
        fi
        
        if [ "$STATUS" == "Ready" ]; then
            if [ "$HEALTH" == "Green" ]; then
                echo -e "${GREEN}Deployment completed successfully!${NC}"
                break
            elif [ "$HEALTH" == "Yellow" ] || [ "$HEALTH" == "Red" ]; then
                echo -e "${YELLOW}Deployment completed with health issues: $HEALTH${NC}"
                break
            fi
        fi
        
        if [ "$STATUS" == "Terminated" ] || [ "$STATUS" == "Failed" ]; then
            echo -e "${RED}Deployment failed with status: $STATUS${NC}"
            break
        fi
        
        ATTEMPT=$((ATTEMPT+1))
    done
    
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo -e "${YELLOW}======== DEPLOYMENT INCOMPLETE ========${NC}"
        echo -e "${YELLOW}The deployment did not complete successfully within the expected time.${NC}"
        echo -e "${YELLOW}Check the AWS Elastic Beanstalk console for more information.${NC}"
        echo -e "${YELLOW}=========================================${NC}"
    else
        echo -e "${GREEN}======== DEPLOYMENT COMPLETE ========${NC}"
        echo -e "${GREEN}Application: $APP_NAME${NC}"
        echo -e "${GREEN}Environment: $ENV_NAME${NC}"
        echo -e "${GREEN}Status: $STATUS${NC}"
        echo -e "${GREEN}Health: $HEALTH${NC}"
        echo -e "${GREEN}Version: $VERSION_LABEL${NC}"
        echo -e "${GREEN}URL: https://$ENV_NAME.us-east-1.elasticbeanstalk.com${NC}"
        echo -e "${GREEN}Configuration saved as: $CONFIG_FILE${NC}"
        echo -e "${GREEN}=====================================${NC}"
    fi
    
    echo -e "${YELLOW}Note: This deployment used minimal configuration without HTTPS or RDS.${NC}"
    echo -e "${YELLOW}After environment is successfully created, you can update with full configuration.${NC}"
    echo -e "${YELLOW}To add RDS and other settings, run: ./scripts/Version0061_fix_config_and_postgres.sh${NC}"
    echo -e "${YELLOW}To add HTTPS support, run: ./scripts/Version0055_add_ssl_certificate.sh${NC}"
else
    echo -e "${YELLOW}Deployment script prepared but not executed.${NC}"
    echo -e "${YELLOW}You can run it later with:${NC}"
    echo -e "${GREEN}./scripts/Version0063_finalize_minimal_deployment.sh${NC}"
fi

# Update script registry
REGISTRY_FILE="scripts/script_registry.md"
if [ -f "$REGISTRY_FILE" ]; then
    # Add to registry if not already present
    if ! grep -q "Version0063_finalize_minimal_deployment.sh" "$REGISTRY_FILE"; then
        # Find the line number of the last script entry
        line_num=$(grep -n "| Version" "$REGISTRY_FILE" | tail -1 | cut -d: -f1)
        if [ ! -z "$line_num" ]; then
            # Insert new entry after the last script
            sed -i.tmp "${line_num}a\\
| Version0063_finalize_minimal_deployment.sh | 1.0.0 | Simplified deployment solution for DottApps | $(date +"%Y-%m-%d") | Not Run |" "$REGISTRY_FILE"
            rm "$REGISTRY_FILE.tmp" 2>/dev/null
            echo -e "${GREEN}✓ Added entry to script registry${NC}"
        fi
    else
        echo -e "${YELLOW}→ Script already in registry${NC}"
    fi
fi

echo -e "${GREEN}Simplified deployment configuration completed!${NC}"
echo -e "${YELLOW}This approach creates a basic environment first, then adds advanced features later.${NC}"
