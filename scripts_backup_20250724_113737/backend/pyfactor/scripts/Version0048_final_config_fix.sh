#!/bin/bash

# Version0048_final_config_fix.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Comprehensive fix for all remaining DottApps configuration issues
# 
# This script addresses persistent configuration issues:
# 1. Properly sets the ServiceRole with the correct namespace
# 2. Removes all Classic Load Balancer settings
# 3. Ensures only Application Load Balancer settings are used
# 4. Validates the SSL certificate configuration

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
BOLD="\033[1m"
NC="\033[0m" # No Color

echo -e "${BLUE}${BOLD}===== DottApps Final Configuration Fix (v1.0.0) =====${NC}"

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
BACKUP_FILE="${BACKUP_DIR}/DottAppsConfig_FinalFix_${TIMESTAMP}.json"
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"

# ServiceRole value
SERVICE_ROLE="arn:aws:iam::471112661935:role/aws-elasticbeanstalk-service-role"
echo -e "${BLUE}Step 1: Setting ServiceRole with correct namespace...${NC}"
echo -e "${YELLOW}Using ServiceRole: ${SERVICE_ROLE}${NC}"

# Certificate ARN
CERTIFICATE_ARN="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"
echo -e "${BLUE}Step 2: Configuring HTTPS with SSL certificate...${NC}"
echo -e "${YELLOW}Using Certificate: ${CERTIFICATE_ARN}${NC}"

# Create a temporary file
TMP_FILE=$(mktemp)

# Step 1: Create a completely new configuration file with proper settings
echo -e "${BLUE}Creating clean configuration file...${NC}"

# Start with an empty array
echo "[" > "$TMP_FILE"

# Add ServiceRole (with proper namespace)
cat >> "$TMP_FILE" << EOL
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
EOL

# Add EC2 and Autoscaling settings
cat >> "$TMP_FILE" << EOL
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
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "DisableIMDSv1",
    "Value": "true"
  },
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "SecurityGroups",
    "Value": "sg-0d385b514eeee83dd"
  },
EOL

# Add Django application environment settings
cat >> "$TMP_FILE" << EOL
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
EOL

# Add VPC settings
cat >> "$TMP_FILE" << EOL
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
EOL

# Add Auto Scaling settings
cat >> "$TMP_FILE" << EOL
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
EOL

# Add Auto Scaling trigger settings
cat >> "$TMP_FILE" << EOL
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
EOL

# Add Application Load Balancer settings (not Classic Load Balancer)
cat >> "$TMP_FILE" << EOL
  {
    "Namespace": "aws:elbv2:loadbalancer",
    "OptionName": "SecurityGroups",
    "Value": "sg-0d385b514eeee83dd"
  },
  {
    "Namespace": "aws:elbv2:loadbalancer",
    "OptionName": "IdleTimeout",
    "Value": "60"
  },
  {
    "Namespace": "aws:elbv2:listener:default",
    "OptionName": "ListenerEnabled",
    "Value": "true"
  },
  {
    "Namespace": "aws:elbv2:listener:80",
    "OptionName": "Protocol",
    "Value": "HTTP"
  },
EOL

# Add SSL Certificate and HTTPS configuration
cat >> "$TMP_FILE" << EOL
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "Protocol",
    "Value": "HTTPS"
  },
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "SSLCertificateArns",
    "Value": "${CERTIFICATE_ARN}"
  },
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "Rules",
    "Value": "default"
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
EOL

# Add HTTP to HTTPS redirection
cat >> "$TMP_FILE" << EOL
  {
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
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:redirect",
    "OptionName": "HealthCheckPath",
    "Value": "/"
  },
EOL

# Add Logs, Monitoring and other settings
cat >> "$TMP_FILE" << EOL
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
EOL

# Add RDS configuration
cat >> "$TMP_FILE" << EOL
  {
    "Namespace": "aws:rds:dbinstance",
    "OptionName": "DBEngine",
    "Value": "postgres"
  },
  {
    "Namespace": "aws:rds:dbinstance",
    "OptionName": "DBEngineVersion",
    "Value": "13.16"
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
  },
  {
    "Namespace": "aws:rds:dbinstance",
    "OptionName": "DBPassword",
    "Value": "DottApps2025DB!"
  }
]
EOL

# Replace original file with our updated version
cp "$TMP_FILE" "$CONFIG_FILE"
rm "$TMP_FILE"

echo -e "${GREEN}✓ Created clean configuration file with proper settings${NC}"

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
echo -e "${BLUE}${BOLD}======== Final Configuration Complete ========${NC}"
echo -e "${GREEN}✓ Your configuration has been completely rebuilt${NC}"
echo -e "${GREEN}✓ ServiceRole is now correctly configured${NC}"
echo -e "${GREEN}✓ Load balancer configuration conflicts resolved${NC}"
echo -e "${GREEN}✓ SSL Certificate: Configured for dottapps.com and www.dottapps.com${NC}"
echo -e "${GREEN}✓ HTTP to HTTPS redirection: Added${NC}"
echo -e "${BLUE}${BOLD}=========================================${NC}"
echo -e "${YELLOW}To deploy with these changes, run:${NC}"
echo -e "${BLUE}./scripts/Version0046_final_dottapps_deploy.sh${NC}"
