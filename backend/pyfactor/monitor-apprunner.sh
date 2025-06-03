#!/bin/bash

# =============================================================================
# 📊 Monitor App Runner Deployment
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

SERVICE_ARN="arn:aws:apprunner:us-east-1:471112661935:service/dott-backend/651d0a8e19504046887e5c19b682050e"
SERVICE_URL="https://gkabexrcrc.us-east-1.awsapprunner.com"
REGION="us-east-1"

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE} 📊 MONITORING APP RUNNER DEPLOYMENT${NC}"
echo -e "${BLUE}=============================================${NC}"

echo -e "${YELLOW}Service URL: ${SERVICE_URL}${NC}"
echo -e "${YELLOW}Health Check: ${SERVICE_URL}/health/${NC}"
echo ""

while true; do
    echo -e "${BLUE}Checking service status...${NC}"
    
    STATUS=$(aws apprunner describe-service --service-arn "$SERVICE_ARN" --region "$REGION" --query 'Service.Status' --output text)
    
    echo -e "Status: ${YELLOW}$STATUS${NC}"
    
    case $STATUS in
        "RUNNING")
            echo -e "${GREEN}🎉 Service is RUNNING!${NC}"
            echo -e "${GREEN}✅ Your backend is live at: ${SERVICE_URL}${NC}"
            echo -e "${GREEN}✅ Health check: ${SERVICE_URL}/health/${NC}"
            break
            ;;
        "CREATE_FAILED"|"DELETE_FAILED"|"UPDATE_FAILED")
            echo -e "${RED}❌ Deployment FAILED with status: $STATUS${NC}"
            echo -e "${RED}Check the AWS Console for detailed error logs${NC}"
            break
            ;;
        "OPERATION_IN_PROGRESS")
            echo -e "${YELLOW}⏳ Still deploying... waiting 30 seconds${NC}"
            sleep 30
            ;;
        *)
            echo -e "${YELLOW}Status: $STATUS - waiting 30 seconds${NC}"
            sleep 30
            ;;
    esac
    echo ""
done

echo ""
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE} 🔗 USEFUL LINKS${NC}"
echo -e "${BLUE}=============================================${NC}"
echo -e "App Runner Console: https://console.aws.amazon.com/apprunner/home?region=us-east-1#/services"
echo -e "CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logs:"
echo -e "Service URL: $SERVICE_URL"
echo -e "Health Check: $SERVICE_URL/health/" 