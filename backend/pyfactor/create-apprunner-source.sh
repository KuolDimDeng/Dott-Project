#!/bin/bash

echo "============================================="
echo " 🚀 CREATING APP RUNNER FROM SOURCE CODE"
echo "============================================="

SERVICE_NAME="dott-backend"
REPO_URL="https://github.com/KuolDimDeng/projectx"
REGION="us-east-1"

# Generate a strong SECRET_KEY for Django
SECRET_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")

echo "ℹ️  Service Name: $SERVICE_NAME"
echo "ℹ️  Repository: $REPO_URL"
echo "ℹ️  Region: $REGION"
echo "ℹ️  Deployment Type: Source Code (No Docker)"
echo "ℹ️  Generated Django SECRET_KEY"

echo "ℹ️  Creating App Runner service from GitHub source..."

aws apprunner create-service \
    --service-name "$SERVICE_NAME" \
    --source-configuration '{
        "CodeRepository": {
            "RepositoryUrl": "'$REPO_URL'",
            "SourceCodeVersion": {
                "Type": "BRANCH",
                "Value": "main"
            },
            "CodeConfiguration": {
                "ConfigurationSource": "REPOSITORY"
            }
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
    echo "./monitor-apprunner-source.sh"
    
    echo ""
    echo "============================================="
    echo " 🔗 USEFUL LINKS"
    echo "============================================="
    echo "App Runner Console: https://console.aws.amazon.com/apprunner/home?region=$REGION#/services"
    echo "GitHub Repository: $REPO_URL"
    
    echo ""
    echo "============================================="
    echo " 🎯 KEY DIFFERENCES"
    echo "============================================="
    echo "✅ No Docker images required"
    echo "✅ No ECR permissions needed"
    echo "✅ App Runner builds from source"
    echo "✅ Faster deployment process"
    echo "✅ Better error visibility"
    
    echo ""
    echo "If this works, we've solved the Docker/ECR issue!"
    
else
    echo "❌ Failed to create App Runner service"
    exit 1
fi 