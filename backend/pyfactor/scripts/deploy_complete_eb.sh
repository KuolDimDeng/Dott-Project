#!/bin/bash
# deploy_complete_eb.sh - Creates a comprehensive AWS Elastic Beanstalk environment
# Version: 1.0.0
# Updated: May 19, 2025

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Set default values
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
APPLICATION_NAME="Dott"
ENVIRONMENT_NAME="Dott-env-complete"
REGION="us-east-1"
S3_BUCKET="elasticbeanstalk-${REGION}-$(aws sts get-caller-identity --query 'Account' --output text)"
VERSION_LABEL="v${APPLICATION_NAME}-$(date +%Y%m%d%H%M%S)"
ENV_OPTIONS_FILE="${BASE_DIR}/environment-options-complete.json"
MONITOR_DEPLOYMENT=false

# Print header
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  AWS Elastic Beanstalk Complete Setup ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Date: $(date)${NC}"
echo -e "${BLUE}Application: ${APPLICATION_NAME}${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT_NAME}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"
echo

# Function to show usage
show_usage() {
    echo -e "${YELLOW}Usage: $0 [options]${NC}"
    echo -e "Options:"
    echo -e "  -a, --application NAME   Specify the application name (default: ${APPLICATION_NAME})"
    echo -e "  -e, --environment NAME   Specify the environment name (default: ${ENVIRONMENT_NAME})"
    echo -e "  -r, --region REGION      Specify the AWS region (default: ${REGION})"
    echo -e "  -b, --bucket NAME        Specify the S3 bucket name (default: ${S3_BUCKET})"
    echo -e "  -v, --version LABEL      Specify the version label (default: ${VERSION_LABEL})"
    echo -e "  -o, --options FILE       Specify the environment options JSON file (default: ${ENV_OPTIONS_FILE})"
    echo -e "  -m, --monitor            Monitor the deployment after starting"
    echo -e "  -h, --help               Show this help message and exit"
    echo
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -a|--application)
            APPLICATION_NAME="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT_NAME="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -b|--bucket)
            S3_BUCKET="$2"
            shift 2
            ;;
        -v|--version)
            VERSION_LABEL="$2"
            shift 2
            ;;
        -o|--options)
            ENV_OPTIONS_FILE="$2"
            shift 2
            ;;
        -m|--monitor)
            MONITOR_DEPLOYMENT=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Update variables after parsing args
S3_BUCKET=${S3_BUCKET/REGION/$REGION}

# Check if AWS CLI is installed
echo -e "${BLUE}Checking AWS CLI installation...${NC}"
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed.${NC}"
    echo -e "${YELLOW}Please install AWS CLI: https://aws.amazon.com/cli/${NC}"
    exit 1
fi
echo -e "${GREEN}AWS CLI is installed.${NC}"

# Check AWS credentials
echo -e "${BLUE}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity --query "Account" --output text &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured.${NC}"
    echo -e "${YELLOW}Please run 'aws configure' to set up your credentials.${NC}"
    exit 1
fi
echo -e "${GREEN}AWS credentials configured.${NC}"
echo

# Create deployment package
echo -e "${BLUE}Creating deployment package...${NC}"
PACKAGE_OUTPUT=$(${SCRIPT_DIR}/create_optimized_docker_package.sh)
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to create deployment package.${NC}"
    exit 1
fi
# Extract just the last line which contains the package name
PACKAGE_NAME=$(echo "$PACKAGE_OUTPUT" | tail -n 1)
echo -e "${GREEN}Created deployment package: ${PACKAGE_NAME}${NC}"
echo

# Upload deployment package to S3
echo -e "${BLUE}Uploading deployment package to S3...${NC}"
echo -e "${GRAY}S3 Bucket: ${S3_BUCKET}${NC}"
echo -e "${GRAY}S3 Key: ${PACKAGE_NAME}${NC}"

# Create S3 bucket if it doesn't exist
echo -e "${BLUE}Checking if S3 bucket exists...${NC}"
if ! aws s3api head-bucket --bucket "${S3_BUCKET}" 2>/dev/null; then
    echo -e "${YELLOW}S3 bucket does not exist. Creating...${NC}"
    aws s3 mb s3://${S3_BUCKET} --region ${REGION}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to create S3 bucket.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Created S3 bucket: ${S3_BUCKET}${NC}"
fi

# Upload package to S3
aws s3 cp ${BASE_DIR}/${PACKAGE_NAME} s3://${S3_BUCKET}/${PACKAGE_NAME}
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to upload deployment package to S3.${NC}"
    exit 1
fi
echo -e "${GREEN}Uploaded deployment package to S3.${NC}"
echo

# Create application version
echo -e "${BLUE}Creating application version...${NC}"
echo -e "${GRAY}Application: ${APPLICATION_NAME}${NC}"
echo -e "${GRAY}Version Label: ${VERSION_LABEL}${NC}"

# Check if application exists
if ! aws elasticbeanstalk describe-applications --application-names ${APPLICATION_NAME} &> /dev/null; then
    echo -e "${YELLOW}Application does not exist. Creating...${NC}"
    aws elasticbeanstalk create-application --application-name ${APPLICATION_NAME} --region ${REGION}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to create application.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Created application: ${APPLICATION_NAME}${NC}"
fi

# Create application version
aws elasticbeanstalk create-application-version \
    --application-name ${APPLICATION_NAME} \
    --version-label ${VERSION_LABEL} \
    --source-bundle S3Bucket="${S3_BUCKET}",S3Key="${PACKAGE_NAME}" \
    --region ${REGION}
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to create application version.${NC}"
    exit 1
fi
echo -e "${GREEN}Created application version: ${VERSION_LABEL}${NC}"
echo

# Check if environment exists
echo -e "${BLUE}Checking if environment exists...${NC}"
ENV_EXISTS=false
if aws elasticbeanstalk describe-environments --application-name ${APPLICATION_NAME} --environment-names ${ENVIRONMENT_NAME} --region ${REGION} | grep -q "${ENVIRONMENT_NAME}"; then
    ENV_EXISTS=true
    echo -e "${GREEN}Environment ${ENVIRONMENT_NAME} exists.${NC}"
else
    echo -e "${YELLOW}Environment ${ENVIRONMENT_NAME} does not exist.${NC}"
fi
echo

# Deploy to Elastic Beanstalk
if [ "$ENV_EXISTS" = true ]; then
    echo -e "${BLUE}Updating existing environment: ${ENVIRONMENT_NAME}${NC}"
    
    # Check if options file exists
    if [ -f "$ENV_OPTIONS_FILE" ]; then
        echo -e "${BLUE}Applying comprehensive environment options from ${ENV_OPTIONS_FILE}...${NC}"
        aws elasticbeanstalk update-environment \
            --application-name ${APPLICATION_NAME} \
            --environment-name ${ENVIRONMENT_NAME} \
            --version-label ${VERSION_LABEL} \
            --option-settings file://${ENV_OPTIONS_FILE} \
            --region ${REGION}
    else
        echo -e "${YELLOW}Environment options file not found. Skipping options.${NC}"
        aws elasticbeanstalk update-environment \
            --application-name ${APPLICATION_NAME} \
            --environment-name ${ENVIRONMENT_NAME} \
            --version-label ${VERSION_LABEL} \
            --region ${REGION}
    fi
else
    echo -e "${BLUE}Creating new environment: ${ENVIRONMENT_NAME}${NC}"
    
    # Check if options file exists
    if [ -f "$ENV_OPTIONS_FILE" ]; then
        echo -e "${BLUE}Applying comprehensive environment options from ${ENV_OPTIONS_FILE}...${NC}"
        aws elasticbeanstalk create-environment \
            --application-name ${APPLICATION_NAME} \
            --environment-name ${ENVIRONMENT_NAME} \
            --solution-stack-name "64bit Amazon Linux 2023 v4.5.2 running Docker" \
            --version-label ${VERSION_LABEL} \
            --option-settings file://${ENV_OPTIONS_FILE} \
            --region ${REGION}
    else
        echo -e "${YELLOW}Environment options file not found. Using defaults.${NC}"
        aws elasticbeanstalk create-environment \
            --application-name ${APPLICATION_NAME} \
            --environment-name ${ENVIRONMENT_NAME} \
            --solution-stack-name "64bit Amazon Linux 2023 v4.5.2 running Docker" \
            --version-label ${VERSION_LABEL} \
            --region ${REGION}
    fi
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Deployment failed.${NC}"
    exit 1
fi

echo -e "${GREEN}Deployment initiated successfully!${NC}"
echo

# Print deployment summary
echo -e "${CYAN}===== DEPLOYMENT SUMMARY =====${NC}"
echo -e "${CYAN}Application: ${APPLICATION_NAME}${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT_NAME}${NC}"
echo -e "${CYAN}Package: ${PACKAGE_NAME}${NC}"
echo -e "${CYAN}Version: ${VERSION_LABEL}${NC}"
echo -e "${CYAN}Region: ${REGION}${NC}"
echo -e "${CYAN}Once deployment is complete, your application will be available at:${NC}"
echo -e "${CYAN}https://${ENVIRONMENT_NAME}.${REGION}.elasticbeanstalk.com${NC}"
echo

echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. Run ${SCRIPT_DIR}/monitor_deployment.sh ${ENVIRONMENT_NAME} ${REGION} to monitor deployment status"
echo -e "2. Check the AWS Elastic Beanstalk console for detailed logs"
echo -e "3. Once deployment is complete, verify your application is working properly"
echo

# Ask if user wants to monitor deployment
if [ "$MONITOR_DEPLOYMENT" = false ]; then
    read -p "Would you like to monitor the deployment? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        MONITOR_DEPLOYMENT=true
    fi
fi

# Monitor deployment if requested
if [ "$MONITOR_DEPLOYMENT" = true ]; then
    echo -e "${BLUE}Monitoring deployment...${NC}"
    ${SCRIPT_DIR}/monitor_deployment.sh ${ENVIRONMENT_NAME} ${REGION}
fi

exit 0
