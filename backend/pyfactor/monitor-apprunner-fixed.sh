#!/bin/bash

SERVICE_ARN="arn:aws:apprunner:us-east-1:471112661935:service/dott-backend/997caa1f2f634591ae1c9f5d6caead7f"
SERVICE_URL="https://gjjyah2dyz.us-east-1.awsapprunner.com"
REGION="us-east-1"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=============================================\033[0m"
echo -e "${BLUE} 📊 MONITORING APP RUNNER DEPLOYMENT\033[0m"
echo -e "${BLUE}=============================================\033[0m"

echo -e "${YELLOW}Service URL: ${SERVICE_URL}\033[0m"
echo -e "${YELLOW}Health Check: ${SERVICE_URL}/health/\033[0m"
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
