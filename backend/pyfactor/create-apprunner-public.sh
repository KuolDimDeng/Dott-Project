#!/bin/bash

echo "============================================="
echo " 🚀 CREATING APP RUNNER SERVICE (PUBLIC ECR)"
echo "============================================="

SERVICE_NAME="dott-backend"
IMAGE_URI="public.ecr.aws/v2s7l6f3/dott-backend-public:latest"
REGION="us-east-1"

# Generate a strong SECRET_KEY for Django
SECRET_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")

echo "ℹ️  Service Name: $SERVICE_NAME"
echo "ℹ️  Image URI: $IMAGE_URI (PUBLIC ECR)"
echo "ℹ️  Region: $REGION"
echo "ℹ️  Mode: Health-Only (Simple Python Server)"
echo "ℹ️  Generated Django SECRET_KEY"

echo "ℹ️  Creating App Runner service with public ECR image..."

aws apprunner create-service \
    --service-name "$SERVICE_NAME" \
    --source-configuration '{
        "ImageRepository": {
            "ImageIdentifier": "'$IMAGE_URI'",
            "ImageConfiguration": {
                "RuntimeEnvironmentVariables": {
                    "HEALTH_ONLY": "true",
                    "DJANGO_SETTINGS_MODULE": "pyfactor.settings_eb",
                    "SECRET_KEY": "'$SECRET_KEY'",
                    "PYTHONUNBUFFERED": "1",
                    "ALLOWED_HOSTS": "*",
                    "CORS_ALLOW_ALL_ORIGINS": "True",
                    "RDS_DB_NAME": "dott_main",
                    "RDS_USERNAME": "dott_admin",
                    "RDS_PASSWORD": "RRfXU6uPPUbBEg1JqGTJ",
                    "RDS_HOSTNAME": "dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com",
                    "RDS_PORT": "5432",
                    "AWS_DEFAULT_REGION": "us-east-1",
                    "AWS_COGNITO_USER_POOL_ID": "us-east-1_JPL8vGfb6",
                    "AWS_COGNITO_CLIENT_ID": "1o5v84mrgn4gt87khtr179uc5b",
                    "AWS_COGNITO_DOMAIN": "pyfactor-dev.auth.us-east-1.amazoncognito.com",
                    "REDIS_HOST": "127.0.0.1",
                    "REDIS_PORT": "6379"
                },
                "Port": "8000"
            },
            "ImageRepositoryType": "ECR_PUBLIC"
        },
        "AutoDeploymentsEnabled": false
    }' \
    --instance-configuration '{
        "Cpu": "1024",
        "Memory": "2048"
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
    echo "./monitor-apprunner-public.sh"
    
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
    echo "1. Monitor deployment: ./monitor-apprunner-public.sh"
    echo "2. Test health endpoint once running"
    echo "3. Once health checks pass, switch to full Django mode"
    echo "4. Update frontend to use new backend URL"
    
else
    echo "❌ Failed to create App Runner service"
    exit 1
fi 