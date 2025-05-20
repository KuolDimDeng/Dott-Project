#!/bin/bash
# check_deployment_logs.sh - Script to check the logs of a deployed Elastic Beanstalk environment
# Version: 1.0.0
# Updated: May 18, 2025

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration variables
ENV_NAME="Dott-env-3"  # Environment name

echo -e "${BLUE}${BOLD}======= AWS EB LOGS ========${NC}"
echo -e "${YELLOW}Fetching logs for environment: ${ENV_NAME}${NC}"

# Fetch the latest logs from Elastic Beanstalk
echo -e "${BLUE}Retrieving logs for environment...${NC}"
aws elasticbeanstalk request-environment-info --environment-name "$ENV_NAME" --info-type tail

# Wait a moment for the logs to be collected
echo -e "${YELLOW}Waiting for logs to be collected...${NC}"
sleep 10

# Retrieve the logs
echo -e "${BLUE}Fetching collected logs...${NC}"
aws elasticbeanstalk retrieve-environment-info --environment-name "$ENV_NAME" --info-type tail

echo -e "${BLUE}${BOLD}======= ENVIRONMENT INFO ========${NC}"
aws elasticbeanstalk describe-environments --environment-names "$ENV_NAME" --query "Environments[0]"

echo -e "${BLUE}${BOLD}======= HEALTH STATUS ========${NC}"
aws elasticbeanstalk describe-environment-health --environment-name "$ENV_NAME" --attribute-names All

echo -e "${BLUE}${BOLD}======= FURTHER TROUBLESHOOTING ========${NC}"
echo -e "${YELLOW}1. Check if the Docker container is running properly${NC}"
echo -e "${YELLOW}2. Verify that the health check endpoint (/health/) is working${NC}"
echo -e "${YELLOW}3. Ensure all environment variables are set correctly${NC}"
echo -e "${YELLOW}4. Check Docker configuration in the Dockerrun.aws.json file${NC}"
