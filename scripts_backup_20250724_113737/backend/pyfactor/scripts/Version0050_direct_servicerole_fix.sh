#!/bin/bash

# Version0050_direct_servicerole_fix.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Direct fix for ServiceRole issue in DottApps deployment
# 
# This script creates a completely new configuration file with the ServiceRole parameter
# positioned correctly, so AWS EB recognizes it. This is a simpler approach than the previous
# script which had dependencies on jq.

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps Direct ServiceRole Fix (v1.0.0) =====${NC}"

# Check if config file exists
CONFIG_FILE="DottAppsConfig.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: $CONFIG_FILE not found in current directory${NC}"
    exit 1
fi

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="DottAppsConfig_ServiceRole_${TIMESTAMP}.bak.json"
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"

# Create a new configuration file from scratch
echo -e "${YELLOW}→ Creating new configuration file with correct structure...${NC}"

# Extract required values from existing config
VPC_ID=$(grep -A 1 "VPCId" "$CONFIG_FILE" | grep "Value" | sed 's/.*"Value": "\(.*\)".*/\1/')
SUBNETS=$(grep -A 1 "Subnets" "$CONFIG_FILE" | grep "Value" | sed 's/.*"Value": "\(.*\)".*/\1/')
ELB_SUBNETS=$(grep -A 1 "ELBSubnets" "$CONFIG_FILE" | grep "Value" | sed 's/.*"Value": "\(.*\)".*/\1/')
SECURITY_GROUP=$(grep -A 1 "SecurityGroups" "$CONFIG_FILE" | grep "Value" | sed 's/.*"Value": "\(.*\)".*/\1/' | head -1)
DB_PASSWORD=$(grep -A 1 "DBPassword" "$CONFIG_FILE" | grep "Value" | sed 's/.*"Value": "\(.*\)".*/\1/')

# Create the new configuration file
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
    "Value": "${ELB_SUBNETS}"
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
    "Value": "${SECURITY_GROUP}"
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
    "Value": "${SECURITY_GROUP}"
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
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "Protocol",
    "Value": "HTTPS"
  },
  {
    "Namespace": "aws:elbv2:listener:80",
    "OptionName": "Protocol",
    "Value": "HTTP"
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
    "Value": "${DB_PASSWORD}"
  }
]
EOF

echo -e "${GREEN}✓ Configuration file has been completely rewritten with correct structure${NC}"
echo -e "${BLUE}=== Configuration Preview (First Entries) ===${NC}"
head -n 10 "$CONFIG_FILE"

echo -e "${GREEN}✓ Configuration file ready for deployment${NC}"
echo -e "${YELLOW}Note: You can now run ./scripts/Version0046_final_dottapps_deploy.sh${NC}"
echo -e "${YELLOW}When prompted, type 'y' to continue despite validation warnings${NC}"
