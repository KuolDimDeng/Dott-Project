#!/bin/bash
# deploy_docker_eb.sh - Deploy the Pyfactor backend to Elastic Beanstalk using Docker
# Version: 1.0.0
# Updated: May 19, 2025

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration variables
APP_NAME="Dott"
ENV_NAME="Dott-env-4"
EB_PLATFORM="Docker running on 64bit Amazon Linux 2023"
REGION="us-east-1"
S3_BUCKET="elasticbeanstalk-${REGION}-$(aws sts get-caller-identity --query Account --output text)"
PACKAGE_NAME="fixed-docker-eb-package-$(date +%Y%m%d%H%M%S).zip"

# Step 1: Make scripts executable
echo -e "${BLUE}Setting execution permissions for scripts...${NC}"
chmod +x scripts/create_docker_fixed_package.sh

# Step 2: Create the fixed Docker deployment package
echo -e "${BLUE}Creating fixed Docker deployment package...${NC}"
./scripts/create_docker_fixed_package.sh

# Verify package creation
if [ ! -f "fixed-docker-eb-package-complete.zip" ]; then
  echo -e "${RED}Error: Deployment package was not created.${NC}"
  exit 1
fi

# Rename the package with timestamp
mv fixed-docker-eb-package-complete.zip $PACKAGE_NAME
echo -e "${GREEN}Created package: $PACKAGE_NAME${NC}"

# Step 3: Upload to S3
echo -e "${BLUE}Uploading deployment package to S3...${NC}"
aws s3 cp $PACKAGE_NAME s3://$S3_BUCKET/$PACKAGE_NAME

# Step 4: Create a new application version
echo -e "${BLUE}Creating new application version...${NC}"
aws elasticbeanstalk create-application-version \
  --application-name $APP_NAME \
  --version-label "v-$(date +%Y%m%d%H%M%S)" \
  --source-bundle S3Bucket=$S3_BUCKET,S3Key=$PACKAGE_NAME \
  --region $REGION

# Get the latest version label
VERSION_LABEL=$(aws elasticbeanstalk describe-application-versions \
  --application-name $APP_NAME \
  --region $REGION \
  --query "ApplicationVersions[0].VersionLabel" \
  --output text)

# Step 5: Create or update environment
echo -e "${BLUE}Checking if environment exists...${NC}"
ENV_EXISTS=$(aws elasticbeanstalk describe-environments \
  --environment-names $ENV_NAME \
  --region $REGION \
  --query "Environments[0].Status" \
  --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "$ENV_EXISTS" == "DOES_NOT_EXIST" ] || [ -z "$ENV_EXISTS" ]; then
  echo -e "${YELLOW}Creating new environment: $ENV_NAME${NC}"
  aws elasticbeanstalk create-environment \
    --application-name $APP_NAME \
    --environment-name $ENV_NAME \
    --solution-stack-name "$EB_PLATFORM" \
    --version-label $VERSION_LABEL \
    --option-settings file://docker-options.json \
    --region $REGION
else
  echo -e "${YELLOW}Updating existing environment: $ENV_NAME${NC}"
  aws elasticbeanstalk update-environment \
    --environment-name $ENV_NAME \
    --version-label $VERSION_LABEL \
    --option-settings file://docker-options.json \
    --region $REGION
fi

# Step 6: Monitor deployment
echo -e "${BLUE}Deployment initiated. Monitoring status...${NC}"
echo -e "${YELLOW}You can check the status using: ./scripts/check_deployment_logs.sh${NC}"

# Print final instructions
echo -e "${GREEN}${BOLD}===== DEPLOYMENT SUMMARY =====${NC}"
echo -e "${GREEN}Application: $APP_NAME${NC}"
echo -e "${GREEN}Environment: $ENV_NAME${NC}"
echo -e "${GREEN}Package: $PACKAGE_NAME${NC}"
echo -e "${GREEN}Version: $VERSION_LABEL${NC}"
echo -e "${GREEN}Region: $REGION${NC}"
echo -e "${YELLOW}Once deployment is complete, your application will be available at:${NC}"
echo -e "${YELLOW}https://$ENV_NAME.${REGION}.elasticbeanstalk.com${NC}"

echo ""
echo -e "${BLUE}${BOLD}Next Steps:${NC}"
echo -e "1. Run ${YELLOW}./scripts/check_deployment_logs.sh${NC} to monitor deployment status"
echo -e "2. Check the AWS Elastic Beanstalk console for detailed logs"
echo -e "3. Once deployment is complete, verify your application is working properly"
