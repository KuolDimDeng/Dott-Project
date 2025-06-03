#!/bin/bash

# =============================================================================
# 🚀 Create App Runner Service with Complete Database Configuration
# =============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}=============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_header "🚀 CREATING APP RUNNER SERVICE WITH DATABASE"

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="471112661935"
ECR_REPOSITORY="dott-backend"
IMAGE_TAG="latest"
SERVICE_NAME="dott-backend"

# Derived variables
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"
FULL_IMAGE_URI="${ECR_URI}:${IMAGE_TAG}"

print_info "Service Name: ${SERVICE_NAME}"
print_info "Image URI: ${FULL_IMAGE_URI}"
print_info "Region: ${AWS_REGION}"

# Generate a secure SECRET_KEY for Django
SECRET_KEY=$(python3 -c "
import secrets
import string
alphabet = string.ascii_letters + string.digits + '!@#$%^&*(-_=+)'
secret_key = ''.join(secrets.choice(alphabet) for i in range(50))
print(secret_key)
")

print_info "Generated Django SECRET_KEY"

# Wait for service deletion to complete
print_info "Waiting for previous service deletion to complete..."
sleep 30

# Create the App Runner service with complete configuration
print_info "Creating App Runner service with database configuration..."

aws apprunner create-service \
  --service-name "${SERVICE_NAME}" \
  --source-configuration "{
    \"ImageRepository\": {
      \"ImageIdentifier\": \"${FULL_IMAGE_URI}\",
      \"ImageConfiguration\": {
        \"Port\": \"8000\",
        \"RuntimeEnvironmentVariables\": {
          \"SECRET_KEY\": \"${SECRET_KEY}\",
          \"DJANGO_SETTINGS_MODULE\": \"pyfactor.settings_eb\",
          \"PYTHONUNBUFFERED\": \"1\",
          \"ALLOWED_HOSTS\": \"*\",
          \"CORS_ALLOW_ALL_ORIGINS\": \"True\",
          \"RDS_DB_NAME\": \"dott_main\",
          \"RDS_USERNAME\": \"dott_admin\",
          \"RDS_PASSWORD\": \"RRfXU6uPPUbBEg1JqGTJ\",
          \"RDS_HOSTNAME\": \"dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com\",
          \"RDS_PORT\": \"5432\",
          \"AWS_COGNITO_USER_POOL_ID\": \"us-east-1_JPL8vGfb6\",
          \"AWS_COGNITO_CLIENT_ID\": \"1o5v84mrgn4gt87khtr179uc5b\",
          \"AWS_COGNITO_DOMAIN\": \"pyfactor-dev.auth.us-east-1.amazoncognito.com\",
          \"AWS_DEFAULT_REGION\": \"us-east-1\",
          \"REDIS_HOST\": \"127.0.0.1\",
          \"REDIS_PORT\": \"6379\"
        }
      },
      \"ImageRepositoryType\": \"ECR\"
    },
    \"AutoDeploymentsEnabled\": false,
    \"AuthenticationConfiguration\": {
      \"AccessRoleArn\": \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/AppRunnerECRAccessRole\"
    }
  }" \
  --instance-configuration "{
    \"Cpu\": \"1 vCPU\",
    \"Memory\": \"2 GB\"
  }" \
  --health-check-configuration "{
    \"Protocol\": \"HTTP\",
    \"Path\": \"/health/\",
    \"Interval\": 10,
    \"Timeout\": 5,
    \"HealthyThreshold\": 2,
    \"UnhealthyThreshold\": 3
  }" \
  --region "${AWS_REGION}" \
  --output json > apprunner-service-result.json

if [ $? -eq 0 ]; then
    print_success "App Runner service created successfully!"
    
    # Extract service details
    SERVICE_ARN=$(cat apprunner-service-result.json | jq -r '.Service.ServiceArn')
    SERVICE_URL=$(cat apprunner-service-result.json | jq -r '.Service.ServiceUrl')
    
    echo ""
    print_header "📋 SERVICE DETAILS"
    echo -e "${GREEN}Service ARN: ${SERVICE_ARN}${NC}"
    echo -e "${GREEN}Service URL: https://${SERVICE_URL}${NC}"
    echo -e "${GREEN}Health Check: https://${SERVICE_URL}/health/${NC}"
    
    echo ""
    print_header "📊 MONITORING"
    echo "Run this command to monitor deployment:"
    echo -e "${BLUE}./monitor-apprunner-fixed.sh${NC}"
    
    # Create updated monitoring script
    cat > monitor-apprunner-fixed.sh << EOF
#!/bin/bash

SERVICE_ARN="${SERVICE_ARN}"
SERVICE_URL="https://${SERVICE_URL}"
REGION="${AWS_REGION}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\${BLUE}=============================================${NC}"
echo -e "\${BLUE} 📊 MONITORING APP RUNNER DEPLOYMENT${NC}"
echo -e "\${BLUE}=============================================${NC}"

echo -e "\${YELLOW}Service URL: \${SERVICE_URL}${NC}"
echo -e "\${YELLOW}Health Check: \${SERVICE_URL}/health/${NC}"
echo ""

while true; do
    echo -e "\${BLUE}Checking service status...\${NC}"
    
    STATUS=\$(aws apprunner describe-service --service-arn "\$SERVICE_ARN" --region "\$REGION" --query 'Service.Status' --output text)
    
    echo -e "Status: \${YELLOW}\$STATUS\${NC}"
    
    case \$STATUS in
        "RUNNING")
            echo -e "\${GREEN}🎉 Service is RUNNING!\${NC}"
            echo -e "\${GREEN}✅ Your backend is live at: \${SERVICE_URL}\${NC}"
            echo -e "\${GREEN}✅ Health check: \${SERVICE_URL}/health/\${NC}"
            break
            ;;
        "CREATE_FAILED"|"DELETE_FAILED"|"UPDATE_FAILED")
            echo -e "\${RED}❌ Deployment FAILED with status: \$STATUS\${NC}"
            echo -e "\${RED}Check the AWS Console for detailed error logs\${NC}"
            break
            ;;
        "OPERATION_IN_PROGRESS")
            echo -e "\${YELLOW}⏳ Still deploying... waiting 30 seconds\${NC}"
            sleep 30
            ;;
        *)
            echo -e "\${YELLOW}Status: \$STATUS - waiting 30 seconds\${NC}"
            sleep 30
            ;;
    esac
    echo ""
done
EOF
    
    chmod +x monitor-apprunner-fixed.sh
    
else
    print_error "Failed to create App Runner service"
    cat apprunner-service-result.json
    exit 1
fi

echo ""
print_header "🔗 USEFUL LINKS"
echo "App Runner Console: https://console.aws.amazon.com/apprunner/home?region=${AWS_REGION}#/services"
echo "CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logs:"
echo ""
print_header "🎯 NEXT STEPS"
echo "1. Monitor deployment: ./monitor-apprunner-fixed.sh"
echo "2. Test health endpoint once running"
echo "3. Update frontend to use new backend URL" 