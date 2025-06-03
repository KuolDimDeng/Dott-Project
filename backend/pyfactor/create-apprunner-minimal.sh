#!/bin/bash

echo "============================================="
echo " 🚀 CREATING APP RUNNER SERVICE (MINIMAL)"
echo "============================================="

SERVICE_NAME="dott-backend"
IMAGE_URI="public.ecr.aws/v2s7l6f3/dott-backend-public:minimal"
REGION="us-east-1"

echo "ℹ️  Service Name: $SERVICE_NAME"
echo "ℹ️  Image URI: $IMAGE_URI (MINIMAL HEALTH SERVER)"
echo "ℹ️  Region: $REGION"
echo "ℹ️  Mode: Pure Python Health Server (No Django, No Dependencies)"

echo "ℹ️  Creating App Runner service with minimal image..."

aws apprunner create-service \
    --service-name "$SERVICE_NAME" \
    --source-configuration '{
        "ImageRepository": {
            "ImageIdentifier": "'$IMAGE_URI'",
            "ImageConfiguration": {
                "Port": "8000"
            },
            "ImageRepositoryType": "ECR_PUBLIC"
        },
        "AutoDeploymentsEnabled": false
    }' \
    --instance-configuration '{
        "Cpu": "256",
        "Memory": "512"
    }' \
    --health-check-configuration '{
        "Protocol": "HTTP",
        "Path": "/health/",
        "Interval": 10,
        "Timeout": 5,
        "HealthyThreshold": 2,
        "UnhealthyThreshold": 3
    }' \
    --region "$REGION"

if [ $? -eq 0 ]; then
    echo "✅ App Runner service created successfully!"
    
    echo ""
    echo "============================================="
    echo " 📋 SERVICE DETAILS"
    echo "============================================="
    
    # Get service details
    SERVICE_ARN=$(aws apprunner list-services --region $REGION --query "ServiceSummaryList[?ServiceName=='$SERVICE_NAME'].ServiceArn" --output text)
    SERVICE_URL=$(aws apprunner list-services --region $REGION --query "ServiceSummaryList[?ServiceName=='$SERVICE_NAME'].ServiceUrl" --output text)
    
    echo "Service ARN: $SERVICE_ARN"
    echo "Service URL: https://$SERVICE_URL"
    echo "Health Check: https://$SERVICE_URL/health/"
    
    echo ""
    echo "============================================="
    echo " 📊 MONITORING"
    echo "============================================="
    echo "Run this command to monitor deployment:"
    echo "./monitor-apprunner-minimal.sh"
    
    echo ""
    echo "============================================="
    echo " 🔗 USEFUL LINKS"
    echo "============================================="
    echo "App Runner Console: https://console.aws.amazon.com/apprunner/home?region=$REGION#/services"
    echo "Public ECR: https://gallery.ecr.aws/v2s7l6f3/dott-backend-public"
    
    echo ""
    echo "============================================="
    echo " 🎯 NEXT STEPS"
    echo "============================================="
    echo "1. Monitor deployment: ./monitor-apprunner-minimal.sh"
    echo "2. Test health endpoint once running"
    echo "3. If successful, this proves App Runner works"
    echo "4. Then we can debug the full Django deployment"
    
else
    echo "❌ Failed to create App Runner service"
    exit 1
fi 