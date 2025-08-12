#!/bin/bash

# Version0053_fix_duplicate_servicerole.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Fix duplicate ServiceRole entries in the configuration file and ensure correct structure

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps ServiceRole Duplicate Fix (v1.0.0) =====${NC}"

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory if it doesn't exist
mkdir -p configuration_backups

# Back up original configuration file
CONFIG_FILE="DottAppsConfig.json"
BACKUP_FILE="configuration_backups/DottAppsConfig_DuplicateFix_${TIMESTAMP}.bak.json"

if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"
else
    echo -e "${RED}Error: Configuration file $CONFIG_FILE not found${NC}"
    exit 1
fi

echo -e "${YELLOW}→ Fixing duplicate ServiceRole entries...${NC}"

# Create a completely new configuration file
TMP_FILE=$(mktemp)

# Extract the correct ServiceRole value
SERVICE_ROLE="arn:aws:iam::471112661935:role/aws-elasticbeanstalk-service-role"

# Create a clean configuration
echo -e "${BLUE}Creating clean configuration file...${NC}"

# Static values
EC2_ROLE="aws-elasticbeanstalk-ec2-role"
VPC_ID="vpc-0564a66b550c7063e"
SUBNETS="subnet-0cc4a92e849ff4b13,subnet-08cd4e29bf37927d4,subnet-005ad102daaebca3a,subnet-00c1377c2d03b3214,subnet-058e65aed208fc90b,subnet-06d85dd067b0b1d59"
ELB_SUBNETS="$SUBNETS"
SECURITY_GROUP="sg-0d385b514eeee83dd"

# Create the clean configuration file with only necessary settings
cat > "$TMP_FILE" << EOL
[
  {
    "Namespace": "aws:elasticbeanstalk:environment",
    "OptionName": "ServiceRole",
    "Value": "$SERVICE_ROLE"
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
    "Value": "$EC2_ROLE"
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
    "Value": "$VPC_ID"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "AssociatePublicIpAddress",
    "Value": "true"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "Subnets",
    "Value": "$SUBNETS"
  },
  {
    "Namespace": "aws:ec2:vpc",
    "OptionName": "ELBSubnets",
    "Value": "$ELB_SUBNETS"
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
    "Value": "$SECURITY_GROUP"
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
    "Value": "$SECURITY_GROUP"
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
    "Namespace": "aws:elbv2:listener:80",
    "OptionName": "Protocol",
    "Value": "HTTP"
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
    "Namespace": "aws:rds:dbinstance",
    "OptionName": "DBEngine",
    "Value": "postgres"
  },
  {
    "Namespace": "aws:rds:dbinstance",
    "OptionName": "DBEngineVersion",
    "Value": "13.7"
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

# Write the fixed content back to the original file
cat "$TMP_FILE" > "$CONFIG_FILE"
rm -f "$TMP_FILE"

echo -e "${GREEN}✓ Configuration file has been fixed${NC}"
echo -e "${GREEN}✓ Duplicate ServiceRole entries removed${NC}"

# Display the first few lines of the fixed configuration
echo -e "${BLUE}=== Configuration Preview (First Entries) ===${NC}"
head -n 15 "$CONFIG_FILE"

# Validate the configuration using the existing validation script
if [ -f "./scripts/Version0042_deployment_error_detection.sh" ]; then
    echo -e "${BLUE}=== Validating fixed configuration file ===${NC}"
    ./scripts/Version0042_deployment_error_detection.sh "$CONFIG_FILE"
else
    echo -e "${YELLOW}Warning: Validation script not found, skipping validation${NC}"
fi

echo -e "${GREEN}✓ ServiceRole duplicate issue resolved${NC}"
echo -e "${YELLOW}Note: You can now run ./scripts/Version0046_final_dottapps_deploy.sh${NC}"
echo -e "${YELLOW}When prompted, type 'y' to continue with deployment${NC}"
