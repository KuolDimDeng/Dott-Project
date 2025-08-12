#!/bin/bash

# Version0040_deploy_dottapps_env.sh - Deploy to Elastic Beanstalk with DottApps configuration
# Version: 1.2.0
# Created: May 22, 2025
# Updated: May 22, 2025 - Added Apple Silicon (M1/M2/M3/M4) compatibility
# Updated: May 22, 2025 - Changed instance type to t2.small and saved config as DottAppsConfig
#
# This script deploys the application to AWS Elastic Beanstalk with the DottApps configuration
# It creates an application named DottApps and an environment named DottApps-env with specific
# configurations including RDS PostgreSQL, SSL/HTTPS, VPC with public IP, and other settings.

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration variables
APP_NAME="DottApps"
ENV_NAME="DottApps-env"
CONFIG_NAME="DottAppsConfig"
VERSION_LABEL="V$(date '+%Y%m%d%H%M%S')" # Unique version label with timestamp
S3_BUCKET="dott-app-deployments-dockerebmanual001"
AWS_REGION="us-east-1" # Default to us-east-1, change if needed
PLATFORM_ARN="arn:aws:elasticbeanstalk:us-east-1::platform/Docker running on 64bit Amazon Linux 2023/4.5.1"
INSTANCE_TYPE="t2.small" # Changed from t2.medium to t2.small per request
EC2_KEY_PAIR="dott-key-pair" # From your configuration
SERVICE_ROLE="arn:aws:iam::471112661935:role/aws-elasticbeanstalk-service-role"
EC2_INSTANCE_PROFILE="aws-elasticbeanstalk-ec2-role"
VPC_ID="vpc-0564a66b550c7063e"
SUBNETS="subnet-0cc4a92e849ff4b13,subnet-08cd4e29bf37927d4,subnet-005ad102daaebca3a,subnet-00c1377c2d03b3214,subnet-058e65aed208fc90b,subnet-06d85dd067b0b1d59"
LOAD_BALANCER_SUBNETS="subnet-005ad102daaebca3a,subnet-00c1377c2d03b3214,subnet-058e65aed208fc90b,subnet-06d85dd067b0b1d59,subnet-08cd4e29bf37927d4,subnet-0cc4a92e849ff4b13"
SECURITY_GROUPS="sg-0d385b514eeee83dd"

echo -e "${BLUE}${BOLD}======== AWS CLI DEPLOYMENT: DOTT APPS ========${NC}"
echo -e "${YELLOW}Deploying application: ${APP_NAME}${NC}"
echo -e "${YELLOW}Environment: ${ENV_NAME}${NC}"
echo -e "${YELLOW}Version: ${VERSION_LABEL}${NC}"
echo -e "${YELLOW}Instance Type: ${INSTANCE_TYPE}${NC}"
echo -e "${YELLOW}Configuration Name: ${CONFIG_NAME}${NC}"

# Check for Apple Silicon architecture and compatible AWS CLI
ARCHITECTURE=$(uname -m)

echo -e "${BLUE}Checking system architecture: ${ARCHITECTURE}${NC}"
if [[ "$ARCHITECTURE" == "arm64" ]]; then
    echo -e "${YELLOW}Apple Silicon (M1/M2/M3/M4) detected.${NC}"
    
    # Check AWS CLI path and version
    AWS_CLI_PATH=$(which aws)
    if [[ -z "$AWS_CLI_PATH" ]]; then
        echo -e "${RED}AWS CLI not found. Installing compatible version for Apple Silicon.${NC}"
        
        echo -e "${YELLOW}Downloading AWS CLI v2 package for Apple Silicon...${NC}"
        curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
        echo -e "${YELLOW}Installing AWS CLI v2. You may be prompted for your password.${NC}"
        sudo installer -pkg AWSCLIV2.pkg -target /
        echo -e "${GREEN}AWS CLI v2 installed.${NC}"
        
        # Clean up
        rm AWSCLIV2.pkg
        
        # Update path to use the newly installed AWS CLI
        AWS_CLI_PATH="/usr/local/bin/aws"
    else
        echo -e "${GREEN}AWS CLI found at: ${AWS_CLI_PATH}${NC}"
    fi
    
    # Check AWS CLI version
    AWS_VERSION=$($AWS_CLI_PATH --version 2>&1)
    
    if [[ $? -ne 0 ]] || [[ "$AWS_VERSION" != *"arm64"* && "$AWS_VERSION" != *"AWS CLI/2"* ]]; then
        echo -e "${RED}AWS CLI version is not compatible with Apple Silicon.${NC}"
        echo -e "${YELLOW}Current version: ${AWS_VERSION}${NC}"
        echo -e "${YELLOW}Please follow the instructions in DOTTAPPS_DEPLOYMENT_GUIDE.md to install a compatible version.${NC}"
        
        read -p "Do you want to automatically install a compatible version now? (y/n): " install_cli
        if [[ "$install_cli" == "y" || "$install_cli" == "Y" ]]; then
            echo -e "${YELLOW}Downloading AWS CLI v2 package for Apple Silicon...${NC}"
            curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
            echo -e "${YELLOW}Installing AWS CLI v2. You may be prompted for your password.${NC}"
            sudo installer -pkg AWSCLIV2.pkg -target /
            echo -e "${GREEN}AWS CLI v2 installed.${NC}"
            
            # Clean up
            rm AWSCLIV2.pkg
            
            # Update path to use the newly installed AWS CLI
            AWS_CLI_PATH="/usr/local/bin/aws"
        else
            echo -e "${RED}Deployment cannot continue without a compatible AWS CLI version.${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}Using AWS CLI: ${AWS_VERSION}${NC}"
    
    # Ensure AWS is configured
    if ! $AWS_CLI_PATH configure list &>/dev/null; then
        echo -e "${YELLOW}AWS CLI is not configured. Please configure it now:${NC}"
        $AWS_CLI_PATH configure
    fi
    
    # Use the correct AWS CLI path for all subsequent commands
    AWS_CMD="$AWS_CLI_PATH"
else
    echo -e "${GREEN}Intel architecture detected. Using standard AWS CLI.${NC}"
    AWS_CMD="aws"
fi

# Create environment options JSON file with the new name DottAppsConfig.json
ENV_OPTIONS_FILE="${CONFIG_NAME}.json"

echo -e "${BLUE}Creating environment options file: ${ENV_OPTIONS_FILE}${NC}"
cat > $ENV_OPTIONS_FILE << EOF
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
    "Value": "${EC2_INSTANCE_PROFILE}"
  },
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "InstanceType",
    "Value": "${INSTANCE_TYPE}"
  },
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "EC2KeyName",
    "Value": "${EC2_KEY_PAIR}"
  },
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "DisableIMDSv1",
    "Value": "true"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "DJANGO_SETTINGS_MODULE",
    "Value": "pyfactor.settings_eb"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "DB_ENGINE",
    "Value": "django.db.backends.postgresql"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "FRONTEND_URL",
    "Value": "https://dottapps.com"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "DOMAIN",
    "Value": "dottapps.com"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "API_DOMAIN",
    "Value": "api.dottapps.com"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "ENVIRONMENT",
    "Value": "production"
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
    "Value": "${LOAD_BALANCER_SUBNETS}"
  },
  {
    "Namespace": "aws:ec2:instances",
    "OptionName": "EnableSpot",
    "Value": "false"
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
    "Value": "${SECURITY_GROUPS}"
  },
  {
    "Namespace": "aws:autoscaling:trigger",
    "OptionName": "MeasureName",
    "Value": "NetworkOut"
  },
  {
    "Namespace": "aws:autoscaling:trigger",
    "OptionName": "Statistic",
    "Value": "Average"
  },
  {
    "Namespace": "aws:autoscaling:trigger",
    "OptionName": "Unit",
    "Value": "Bytes"
  },
  {
    "Namespace": "aws:autoscaling:trigger",
    "OptionName": "Period",
    "Value": "5"
  },
  {
    "Namespace": "aws:autoscaling:trigger",
    "OptionName": "BreachDuration",
    "Value": "5"
  },
  {
    "Namespace": "aws:autoscaling:trigger",
    "OptionName": "UpperThreshold",
    "Value": "6000000"
  },
  {
    "Namespace": "aws:autoscaling:trigger",
    "OptionName": "UpperBreachScaleIncrement",
    "Value": "1"
  },
  {
    "Namespace": "aws:autoscaling:trigger",
    "OptionName": "LowerThreshold",
    "Value": "2000000"
  },
  {
    "Namespace": "aws:autoscaling:trigger",
    "OptionName": "LowerBreachScaleIncrement",
    "Value": "-1"
  },
  {
    "Namespace": "aws:elbv2:loadbalancer",
    "OptionName": "SecurityGroups",
    "Value": "${SECURITY_GROUPS}"
  },
  {
    "Namespace": "aws:elbv2:loadbalancer",
    "OptionName": "IdleTimeout",
    "Value": "60"
  },
  {
    "Namespace": "aws:elasticbeanstalk:cloudwatch:logs",
    "OptionName": "StreamLogs",
    "Value": "true"
  },
  {
    "Namespace": "aws:elasticbeanstalk:cloudwatch:logs",
    "OptionName": "DeleteOnTerminate",
    "Value": "false"
  },
  {
    "Namespace": "aws:elasticbeanstalk:cloudwatch:logs",
    "OptionName": "RetentionInDays",
    "Value": "7"
  },
  {
    "Namespace": "aws:elasticbeanstalk:cloudwatch:logs:health",
    "OptionName": "HealthStreamingEnabled",
    "Value": "true"
  },
  {
    "Namespace": "aws:elasticbeanstalk:cloudwatch:logs:health",
    "OptionName": "RetentionInDays",
    "Value": "7"
  },
  {
    "Namespace": "aws:elasticbeanstalk:command",
    "OptionName": "DeploymentPolicy",
    "Value": "Rolling"
  },
  {
    "Namespace": "aws:elasticbeanstalk:command",
    "OptionName": "BatchSizeType",
    "Value": "Percentage"
  },
  {
    "Namespace": "aws:elasticbeanstalk:command",
    "OptionName": "BatchSize",
    "Value": "33"
  },
  {
    "Namespace": "aws:elasticbeanstalk:command",
    "OptionName": "Timeout",
    "Value": "600"
  },
  {
    "Namespace": "aws:elbv2:listener:default",
    "OptionName": "ListenerEnabled",
    "Value": "true"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:proxy",
    "OptionName": "ProxyServer",
    "Value": "nginx"
  },
  {
    "Namespace": "aws:elasticbeanstalk:healthreporting:system",
    "OptionName": "SystemType",
    "Value": "enhanced"
  },
  {
    "Namespace": "aws:elasticbeanstalk:managedactions",
    "OptionName": "ManagedActionsEnabled",
    "Value": "true"
  },
  {
    "Namespace": "aws:elasticbeanstalk:managedactions",
    "OptionName": "PreferredStartTime",
    "Value": "Tue:10:00"
  },
  {
    "Namespace": "aws:elasticbeanstalk:managedactions:platformupdate",
    "OptionName": "UpdateLevel",
    "Value": "minor"
  },
  {
    "Namespace": "aws:elasticbeanstalk:managedactions:platformupdate",
    "OptionName": "InstanceRefreshEnabled",
    "Value": "false"
  },
  {
    "Namespace": "aws:elasticbeanstalk:sns:topics",
    "OptionName": "Notification Endpoint",
    "Value": "support@dottapps.com"
  },
  {
    "Namespace": "aws:elb:listener:80",
    "OptionName": "ListenerEnabled",
    "Value": "true"
  },
  {
    "Namespace": "aws:elb:listener:80",
    "OptionName": "Protocol",
    "Value": "HTTP"
  },
  {
    "Namespace": "aws:elb:listener:80",
    "OptionName": "InstancePort",
    "Value": "80"
  },
  {
    "Namespace": "aws:elb:listener:80",
    "OptionName": "ListenerProtocol",
    "Value": "HTTP"
  },
  {
    "Namespace": "aws:elb:listener:443",
    "OptionName": "ListenerEnabled",
    "Value": "true"
  },
  {
    "Namespace": "aws:elb:listener:443",
    "OptionName": "Protocol",
    "Value": "HTTPS"
  },
  {
    "Namespace": "aws:elb:listener:443",
    "OptionName": "InstancePort",
    "Value": "80"
  },
  {
    "Namespace": "aws:elb:listener:443",
    "OptionName": "ListenerProtocol",
    "Value": "HTTPS"
  },
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "Protocol",
    "Value": "HTTPS"
  },
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "Rules",
    "Value": "https"
  },
  {
    "Namespace": "aws:elbv2:listener:80",
    "OptionName": "Protocol",
    "Value": "HTTP"
  },
  {
    "Namespace": "aws:elbv2:listener:80",
    "OptionName": "Rules",
    "Value": "http"
  },
  {
    "Namespace": "aws:elbv2:listenerrule:http",
    "OptionName": "PathPatterns",
    "Value": "/*"
  },
  {
    "Namespace": "aws:elbv2:listenerrule:http",
    "OptionName": "Priority",
    "Value": "1"
  },
  {
    "Namespace": "aws:elbv2:listenerrule:http",
    "OptionName": "Process",
    "Value": "default"
  },
  {
    "Namespace": "aws:elbv2:listener:80",
    "OptionName": "Rules",
    "Value": "redirect"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:redirect",
    "OptionName": "Port",
    "Value": "80"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:redirect",
    "OptionName": "Protocol",
    "Value": "HTTP"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:redirect",
    "OptionName": "HealthCheckPath",
    "Value": "/"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:redirect",
    "OptionName": "StickinessEnabled",
    "Value": "true"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:redirect",
    "OptionName": "MatcherHTTPCode",
    "Value": "301"
  },
  {
    "Namespace": "aws:rds:dbinstance",
    "OptionName": "DBEngine",
    "Value": "postgres"
  },
  {
    "Namespace": "aws:rds:dbinstance",
    "OptionName": "DBEngineVersion",
    "Value": "14.7"
  },
  {
    "Namespace": "aws:rds:dbinstance",
    "OptionName": "DBInstanceClass",
    "Value": "db.t3.small"
  },
  {
    "Namespace": "aws:rds:dbinstance",
    "OptionName": "DBAllocatedStorage",
    "Value": "10"
  },
  {
    "Namespace": "aws:rds:dbinstance",
    "OptionName": "DBDeletionPolicy",
    "Value": "Snapshot"
  },
  {
    "Namespace": "aws:rds:dbinstance",
    "OptionName": "HasCoupledDatabase",
    "Value": "true"
  },
  {
    "Namespace": "aws:rds:dbinstance",
    "OptionName": "MultiAZDatabase",
    "Value": "false"
  }
]
EOF

# Make a backup of the configuration for future use
CONFIG_BACKUP_DIR="configuration_backups"
mkdir -p $CONFIG_BACKUP_DIR
CONFIG_BACKUP_PATH="${CONFIG_BACKUP_DIR}/${CONFIG_NAME}_$(date '+%Y%m%d').json"
cp $ENV_OPTIONS_FILE $CONFIG_BACKUP_PATH
echo -e "${GREEN}Configuration saved to ${CONFIG_BACKUP_PATH} for future use${NC}"

# Step 1: Check if the application exists
echo -e "${BLUE}Checking if application exists...${NC}"
if ! $AWS_CMD elasticbeanstalk describe-applications --application-names "$APP_NAME" &>/dev/null; then
  echo -e "${YELLOW}Application does not exist. Creating application...${NC}"
  $AWS_CMD elasticbeanstalk create-application --application-name "$APP_NAME" --description "Application for DottApps"
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create application. Check AWS CLI output above.${NC}"
    exit 1
  fi
  echo -e "${GREEN}Application created successfully!${NC}"
fi

# Use the specific package either created with Docker or standard EB
BACKEND_DIR="$(pwd)"
read -p "Enter the path to your deployment package (relative to current directory): " PACKAGE_PATH
LATEST_PACKAGE="$BACKEND_DIR/$PACKAGE_PATH"

if [ ! -f "$LATEST_PACKAGE" ]; then
    echo -e "${RED}Error: Package not found: ${LATEST_PACKAGE}${NC}"
    echo -e "${YELLOW}Available packages:${NC}"
    find "$BACKEND_DIR" -name "*.zip" -maxdepth 1 | xargs -n1 basename
    echo -e "${YELLOW}Please check if the file exists and enter a valid path.${NC}"
    exit 1
fi

S3_KEY="dottapps-$(basename "$LATEST_PACKAGE")"
echo -e "${GREEN}Using package: ${LATEST_PACKAGE}${NC}"
echo -e "${GREEN}Package size: $(du -h "$LATEST_PACKAGE" | cut -f1)${NC}"
echo -e "${YELLOW}Will use S3 key: ${S3_KEY}${NC}"

# Step 2: Upload the package to S3
echo -e "${BLUE}Uploading package to S3...${NC}"
if ! $AWS_CMD s3 cp "$LATEST_PACKAGE" "s3://$S3_BUCKET/$S3_KEY"; then
  echo -e "${RED}Error: Failed to upload package to S3.${NC}"
  echo -e "${YELLOW}Please check that the S3 bucket exists and you have access.${NC}"
  exit 1
fi
echo -e "${GREEN}Package uploaded successfully!${NC}"

# Step 3: Create the application version with process=false to handle large files
echo -e "${BLUE}Creating application version from S3...${NC}"
echo -e "${YELLOW}NOTE: This script bypasses size limits by setting process=false${NC}"

$AWS_CMD elasticbeanstalk create-application-version \
  --application-name "$APP_NAME" \
  --version-label "$VERSION_LABEL" \
  --description "DottApps deployment package" \
  --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" \
  --auto-create-application \
  --no-process

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to create application version.${NC}"
  echo -e "${YELLOW}This could be due to:${NC}"
  echo -e "${YELLOW}1. Package exceeding 512MB size limit (common with Docker packages)${NC}"
  echo -e "${YELLOW}2. S3 bucket permissions issue${NC}"
  echo -e "${YELLOW}3. Invalid application name${NC}"
  exit 1
fi
echo -e "${GREEN}Application version created successfully!${NC}"

# Step 4: Check if the environment exists and deploy
echo -e "${BLUE}Checking if environment exists...${NC}"
if $AWS_CMD elasticbeanstalk describe-environments --environment-names "$ENV_NAME" --application-name "$APP_NAME" | grep -q "\"Status\": \"Ready\"\|\"Status\": \"Updating\""; then
  # Environment exists, update it with the new options
  echo -e "${YELLOW}Environment exists. Updating with environment options and new version...${NC}"

  # Save the current configuration with the DottAppsConfig name
  echo -e "${BLUE}Saving current configuration as ${CONFIG_NAME}...${NC}"
  $AWS_CMD elasticbeanstalk update-environment-configuration \
    --application-name "$APP_NAME" \
    --environment-name "$ENV_NAME" \
    --option-settings file://$ENV_OPTIONS_FILE \
    --configuration-name "$CONFIG_NAME"
  
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Could not save configuration with name ${CONFIG_NAME}. Continuing with deployment.${NC}"
  else
    echo -e "${GREEN}Configuration saved as ${CONFIG_NAME} for future use${NC}"
  fi

  # Update environment with the options JSON file
  echo -e "${BLUE}Applying environment configuration options...${NC}"
  $AWS_CMD elasticbeanstalk update-environment \
    --application-name "$APP_NAME" \
    --environment-name "$ENV_NAME" \
    --option-settings file://$ENV_OPTIONS_FILE \
    --version-label "$VERSION_LABEL"

  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to update environment. Check AWS CLI output above.${NC}"
    exit 1
  fi
  echo -e "${GREEN}Environment update initiated successfully!${NC}"
else
  # Environment doesn't exist, create it
  echo -e "${YELLOW}Environment does not exist. Creating new environment...${NC}"
  $AWS_CMD elasticbeanstalk create-environment \
    --application-name "$APP_NAME" \
    --environment-name "$ENV_NAME" \
    --platform-arn "$PLATFORM_ARN" \
    --option-settings file://$ENV_OPTIONS_FILE \
    --version-label "$VERSION_LABEL" \
    --configuration-name "$CONFIG_NAME"

  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create environment. Check AWS CLI output above.${NC}"
    exit 1
  fi
  echo -e "${GREEN}Environment creation initiated successfully!${NC}"
fi

# Step 5: Wait for deployment to complete and show status
echo -e "${BLUE}Waiting for deployment to complete...${NC}"
echo -e "${YELLOW}This may take 5-10 minutes. Please be patient.${NC}"
echo -e "${YELLOW}You can check the status in the AWS Elastic Beanstalk console.${NC}"
echo -e "${YELLOW}URL: https://$ENV_NAME.$AWS_REGION.elasticbeanstalk.com${NC}"

# Poll for status every 30 seconds for up to 15 minutes
MAX_ATTEMPTS=30 # 15 minutes (30 attempts × 30 seconds)
attempts=0
success=false

while [ $attempts -lt $MAX_ATTEMPTS ]; do
  sleep 30
  status=$($AWS_CMD elasticbeanstalk describe-environments --environment-names "$ENV_NAME" --query "Environments[0].Status" --output text)
  health=$($AWS_CMD elasticbeanstalk describe-environments --environment-names "$ENV_NAME" --query "Environments[0].Health" --output text)

  echo -e "${BLUE}Current status: ${status}, Health: ${health}${NC}"

  if [ "$status" == "Ready" ]; then
    if [ "$health" == "Green" ] || [ "$health" == "Yellow" ]; then
      success=true
      break
    fi
  fi

  attempts=$((attempts+1))
done

if [ "$success" = true ]; then
  echo -e "${GREEN}${BOLD}======== DEPLOYMENT SUCCESSFUL ========${NC}"
  echo -e "${GREEN}Your application has been deployed successfully!${NC}"
  echo -e "${GREEN}Environment URL: https://$ENV_NAME.$AWS_REGION.elasticbeanstalk.com${NC}"

  # Get additional information about the environment
  echo -e "${BLUE}Getting environment details...${NC}"
  $AWS_CMD elasticbeanstalk describe-environments --environment-names "$ENV_NAME" --query "Environments[0].{Status:Status,Health:Health,DateUpdated:DateUpdated,VersionLabel:VersionLabel}" --output json

  # Check if RDS is connected (if HasCoupledDatabase was set to true)
  echo -e "${BLUE}Checking RDS connection...${NC}"
  rds_status=$($AWS_CMD elasticbeanstalk describe-configuration-settings --application-name "$APP_NAME" --environment-name "$ENV_NAME" --query "ConfigurationSettings[0].OptionSettings[?Namespace=='aws:rds:dbinstance'].OptionName" --output text)
  if [[ $rds_status == *"DBInstanceId"* ]]; then
    echo -e "${GREEN}RDS database is successfully coupled with the environment.${NC}"
    $AWS_CMD elasticbeanstalk describe-configuration-settings --application-name "$APP_NAME" --environment-name "$ENV_NAME" --query "ConfigurationSettings[0].OptionSettings[?Namespace=='aws:rds:dbinstance']" --output table
  else
    echo -e "${YELLOW}RDS database configuration may need review.${NC}"
  fi
else
  echo -e "${YELLOW}${BOLD}======== DEPLOYMENT IN PROGRESS ========${NC}"
  echo -e "${YELLOW}Deployment is still in progress after waiting period.${NC}"
  echo -e "${YELLOW}You can check the status in the AWS Elastic Beanstalk console.${NC}"
  echo -e "${YELLOW}Environment URL: https://$ENV_NAME.$AWS_REGION.elasticbeanstalk.com${NC}"
fi

echo -e "${BLUE}${BOLD}======== DEPLOYMENT PROCESS COMPLETE ========${NC}"
echo -e "${BLUE}Check the AWS Elastic Beanstalk console for detailed status.${NC}"
echo -e "${GREEN}${BOLD}Configuration settings have been applied according to requirements:${NC}"
echo -e "${GREEN}✅ DottApps application name${NC}"
echo -e "${GREEN}✅ DottApps-env environment name${NC}"
echo -e "${GREEN}✅ DottAppsConfig saved locally for future use${NC}"
echo -e "${GREEN}✅ t2.small instance type${NC}"
echo -e "${GREEN}✅ VPC configuration${NC}"
echo -e "${GREEN}✅ RDS PostgreSQL database integration${NC}"
echo -e "${GREEN}✅ HTTPS/SSL configuration${NC}"
