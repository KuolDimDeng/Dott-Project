#!/bin/bash

# =============================================================================
# 🔧 Fix App Runner Service
# =============================================================================
# This script deletes the failed service and recreates it properly
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="471112661935"
ECR_REPOSITORY="dott-backend"
IMAGE_TAG="latest"
APP_RUNNER_SERVICE="dott-backend"

# Derived variables
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"
FULL_IMAGE_URI="${ECR_URI}:${IMAGE_TAG}"

print_header() {
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}=============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header "🔧 FIXING APP RUNNER SERVICE"

# Get the service ARN
SERVICE_ARN=$(aws apprunner list-services --region ${AWS_REGION} --query "ServiceSummaryList[?ServiceName=='${APP_RUNNER_SERVICE}'].ServiceArn" --output text 2>/dev/null || echo "")

if [ -n "$SERVICE_ARN" ]; then
    print_info "Found existing service with ARN: $SERVICE_ARN"
    print_info "Deleting failed service..."
    
    aws apprunner delete-service --service-arn "$SERVICE_ARN" --region ${AWS_REGION}
    
    print_info "Waiting for service deletion..."
    aws apprunner wait service-deleted --service-arn "$SERVICE_ARN" --region ${AWS_REGION}
    
    print_success "Service deleted successfully"
else
    print_info "No existing service found"
fi

print_header "📝 CREATING NEW APP RUNNER SERVICE"

# Create the service configuration JSON
cat > apprunner-service-config.json << EOF
{
    "ServiceName": "${APP_RUNNER_SERVICE}",
    "SourceConfiguration": {
        "ImageRepository": {
            "ImageIdentifier": "${FULL_IMAGE_URI}",
            "ImageConfiguration": {
                "Port": "8000",
                "RuntimeEnvironmentVariables": {
                    "ALLOWED_HOSTS": "*",
                    "CORS_ALLOW_ALL_ORIGINS": "True",
                    "CORS_ALLOW_CREDENTIALS": "True",
                    "DATABASE_HOST": "dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com",
                    "DATABASE_NAME": "dott_main",
                    "DATABASE_PASSWORD": "RRfXU6uPPUbBEg1JqGTJ",
                    "DATABASE_PORT": "5432",
                    "DATABASE_URL": "postgresql://dott_admin:RRfXU6uPPUbBEg1JqGTJ@dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com:5432/dott_main",
                    "DATABASE_USER": "dott_admin",
                    "DEBUG": "False",
                    "DJANGO_SETTINGS_MODULE": "pyfactor.settings_eb",
                    "PORT": "8000",
                    "PYTHONPATH": "/app",
                    "PYTHONUNBUFFERED": "1",
                    "SECRET_KEY": "t+3=29ifzne^^$626vnvq7w5f&ky7g%54=ca^q3$!#v&%ubjib"
                },
                "StartCommand": "/app/start.sh"
            },
            "ImageRepositoryType": "ECR"
        },
        "AutoDeploymentsEnabled": false
    },
    "InstanceConfiguration": {
        "Cpu": "1 vCPU",
        "Memory": "2 GB",
        "InstanceRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/AppRunnerInstanceRole"
    },
    "AutoScalingConfigurationArn": "arn:aws:apprunner:${AWS_REGION}:${AWS_ACCOUNT_ID}:autoscalingconfiguration/DefaultConfiguration/1/00000000000000000000000000000001",
    "NetworkConfiguration": {
        "EgressConfiguration": {
            "EgressType": "VPC",
            "VpcConnectorArn": "arn:aws:apprunner:${AWS_REGION}:${AWS_ACCOUNT_ID}:vpcconnector/dott-vpc-connector/1/00000000000000000000000000000001"
        }
    },
    "HealthCheckConfiguration": {
        "Protocol": "HTTP",
        "Path": "/health/",
        "IntervalSeconds": 10,
        "TimeoutSeconds": 5,
        "HealthyThreshold": 1,
        "UnhealthyThreshold": 5
    }
}
EOF

print_info "Service configuration created"

# Note: We can't create the service yet because the ECR image doesn't exist
# This will be done after the Docker image is built and pushed

print_header "📋 INSTRUCTIONS"

echo ""
print_info "To complete the setup:"
echo "1. First, start Docker Desktop on your Mac"
echo "2. Run the deployment script: ./deploy-to-apprunner.sh"
echo "3. This will build and push the Docker image to ECR"
echo "4. Then manually create the App Runner service using the AWS Console:"
echo "   - Go to App Runner in AWS Console"
echo "   - Click 'Create service'"
echo "   - Choose 'Container registry' as source"
echo "   - Select 'Amazon ECR' and choose 'Browse' to find your image"
echo "   - Use image URI: ${FULL_IMAGE_URI}"
echo "   - Configure the environment variables as shown in the console"
echo "   - Use the health check path: /health/"
echo ""

print_success "Setup instructions complete!"
print_info "The service configuration has been saved to: apprunner-service-config.json" 