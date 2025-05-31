#!/bin/bash

# Simple deployment using AWS native tools
set -e

echo "🚀 Deploying to App Runner using AWS Build Service..."
echo "=============================================="

# Configuration
AWS_ACCOUNT_ID="471112661935"
AWS_REGION="us-east-1"
SERVICE_ARN="arn:aws:apprunner:us-east-1:471112661935:service/dott-backend/cc38ede280394a90be8ecd8f05e4d03f"

echo "📋 Configuration:"
echo "   AWS Account: $AWS_ACCOUNT_ID"
echo "   Region: $AWS_REGION"
echo "   Service ARN: $SERVICE_ARN"
echo ""

# Check current service status
echo "📊 Checking current service status..."
STATUS=$(aws apprunner describe-service --service-arn $SERVICE_ARN --region $AWS_REGION --query 'Service.Status' --output text)
echo "   Current status: $STATUS"

# If service is running or in progress, let's try to trigger deployment directly
if [ "$STATUS" = "RUNNING" ] || [ "$STATUS" = "OPERATION_IN_PROGRESS" ]; then
    echo "🎯 Service exists, checking if we can trigger a deployment..."
    
    # Try to start a deployment to see what happens
    echo "🚀 Attempting to start deployment..."
    OPERATION_ID=$(aws apprunner start-deployment --service-arn $SERVICE_ARN --region $AWS_REGION --query 'OperationId' --output text 2>/dev/null || echo "FAILED")
    
    if [ "$OPERATION_ID" != "FAILED" ]; then
        echo "✅ Deployment started with Operation ID: $OPERATION_ID"
        echo "🔗 Monitor at: https://console.aws.amazon.com/apprunner/home?region=$AWS_REGION#/services"
    else
        echo "⚠️ Cannot start deployment - Docker image may be missing from ECR"
        echo ""
        echo "🔍 Let's check ECR repository..."
        
        # Check if ECR repository has images
        IMAGES=$(aws ecr describe-images --repository-name dott-backend --region $AWS_REGION --query 'imageDetails | length(@)' --output text 2>/dev/null || echo "0")
        
        if [ "$IMAGES" = "0" ]; then
            echo "❌ No Docker images found in ECR repository"
            echo ""
            echo "💡 Next steps:"
            echo "   1. You need to build and push a Docker image to ECR"
            echo "   2. The ECR repository exists at: 471112661935.dkr.ecr.us-east-1.amazonaws.com/dott-backend"
            echo "   3. Once you have Docker running locally, use: ./deploy-to-apprunner.sh"
            echo ""
            echo "🛠️ Alternative: Use AWS CodeBuild to build the image remotely"
            echo "   This would require setting up a CodeBuild project with your source code"
        else
            echo "✅ Found $IMAGES image(s) in ECR repository"
            echo "🔄 The service might be initializing with existing image"
        fi
    fi
else
    echo "⚠️ Service is in status: $STATUS"
    echo "🔄 Waiting for service to become ready..."
fi

echo ""
echo "📍 Your App Runner service:"
echo "   Service URL: https://qgpng3dxpj.us-east-1.awsapprunner.com"
echo "   Health Check: https://qgpng3dxpj.us-east-1.awsapprunner.com/health/"
echo "   Admin Panel: https://qgpng3dxpj.us-east-1.awsapprunner.com/admin/"
echo ""
echo "📊 Monitor service status:"
echo "   aws apprunner describe-service --service-arn $SERVICE_ARN --region $AWS_REGION --query 'Service.Status'"