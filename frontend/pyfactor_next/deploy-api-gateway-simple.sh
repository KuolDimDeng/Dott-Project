#!/bin/bash

# Simplified Dott API Gateway Deployment Script
# Avoids complex shell operations that might cause issues
# Created: 2025-05-22

set -e

echo "🚀 Starting Dott API Gateway Deployment (Simplified)..."

# Configuration
STACK_NAME="dott-api-gateway"
TEMPLATE_FILE="infrastructure/api-gateway.yml"
ENVIRONMENT="production"
AWS_REGION="us-east-1"

# Parameters
COGNITO_USER_POOL_ID="us-east-1_JPL8vGfb6"
DJANGO_BACKEND_URL="https://api.dottapps.com"
NEXTJS_API_URL="https://frontend.dottapps.com"

echo "📋 Deployment Configuration:"
echo "   Stack Name: $STACK_NAME"
echo "   Environment: $ENVIRONMENT"
echo "   AWS Region: $AWS_REGION"
echo "   Cognito User Pool ID: $COGNITO_USER_POOL_ID"
echo "   Django Backend URL: $DJANGO_BACKEND_URL"
echo "   Next.js API URL: $NEXTJS_API_URL"

# Basic checks
echo "🔍 Running basic checks..."

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ CloudFormation template not found: $TEMPLATE_FILE"
    exit 1
fi

echo "✅ Template file exists"

# Clean up any existing failed stack
echo "🧹 Cleaning up any existing stack..."
aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION 2>/dev/null || true

# Wait a bit for cleanup
echo "⏳ Waiting for cleanup..."
sleep 20

# Deploy stack
echo "🚀 Deploying CloudFormation stack..."
aws cloudformation create-stack \
    --stack-name $STACK_NAME \
    --template-body file://$TEMPLATE_FILE \
    --parameters \
        ParameterKey=CognitoUserPoolId,ParameterValue=$COGNITO_USER_POOL_ID \
        ParameterKey=DjangoBackendUrl,ParameterValue=$DJANGO_BACKEND_URL \
        ParameterKey=NextJSApiUrl,ParameterValue=$NEXTJS_API_URL \
        ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
    --capabilities CAPABILITY_IAM \
    --region $AWS_REGION \
    --tags \
        Key=Application,Value=Dott \
        Key=Environment,Value=$ENVIRONMENT \
        Key=ManagedBy,Value=CloudFormation

if [ $? -eq 0 ]; then
    echo "✅ Stack creation initiated successfully"
    echo "⏳ Waiting for stack to complete (this may take 5-10 minutes)..."
    
    # Wait for completion
    aws cloudformation wait stack-create-complete \
        --stack-name $STACK_NAME \
        --region $AWS_REGION
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Dott API Gateway deployed successfully!"
        
        # Get the API Gateway URL
        API_GATEWAY_URL=$(aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --region $AWS_REGION \
            --query 'Stacks[0].Outputs[?OutputKey==`APIGatewayURL`].OutputValue' \
            --output text)
        
        echo ""
        echo "🌐 API Gateway Information:"
        echo "   API Gateway URL: $API_GATEWAY_URL"
        echo ""
        echo "🔗 Available Endpoints:"
        echo "   Payroll Reports:    $API_GATEWAY_URL/payroll/reports"
        echo "   Payroll Run:        $API_GATEWAY_URL/payroll/run"
        echo "   Payroll Export:     $API_GATEWAY_URL/payroll/export-report"
        echo "   Payroll Settings:   $API_GATEWAY_URL/payroll/settings"
        echo "   Business APIs:      $API_GATEWAY_URL/business/*"
        echo "   Onboarding APIs:    $API_GATEWAY_URL/onboarding/*"
        echo ""
        echo "🔧 Next Steps:"
        echo "   1. Update frontend configuration: ./update-api-config.sh \"$API_GATEWAY_URL\" production"
        echo "   2. Test the endpoints with valid Cognito tokens"
        echo "   3. Monitor usage in CloudWatch"
        
        # Save deployment info
        echo "{\"apiGatewayUrl\":\"$API_GATEWAY_URL\",\"deploymentTime\":\"$(date)\",\"environment\":\"$ENVIRONMENT\"}" > dott-api-gateway-deployment.json
        echo "📄 Deployment info saved to: dott-api-gateway-deployment.json"
        
    else
        echo "❌ Stack creation failed"
        echo "🔍 Check AWS Console or run:"
        echo "   aws cloudformation describe-stack-events --stack-name $STACK_NAME --region $AWS_REGION"
        exit 1
    fi
else
    echo "❌ Failed to initiate stack creation"
    exit 1
fi 