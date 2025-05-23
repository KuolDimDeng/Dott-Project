#!/bin/bash

# Dott API Gateway Deployment Script
# Deploys API Gateway with Cognito integration via CloudFormation
# Created: 2025-05-22

set -e

echo "🚀 Starting Dott API Gateway Deployment..."

# Configuration
STACK_NAME="dott-api-gateway"
TEMPLATE_FILE="infrastructure/api-gateway.yml"
ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}

# Default values - update these for your environment
COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID:-"us-east-1_JPL8vGfb6"}
DJANGO_BACKEND_URL=${DJANGO_BACKEND_URL:-"https://api.dottapps.com"}
NEXTJS_API_URL=${NEXTJS_API_URL:-"https://your-nextjs-deployment.vercel.app"}

echo "📋 Deployment Configuration:"
echo "   Stack Name: $STACK_NAME"
echo "   Environment: $ENVIRONMENT"
echo "   AWS Region: $AWS_REGION"
echo "   Cognito User Pool ID: $COGNITO_USER_POOL_ID"
echo "   Django Backend URL: $DJANGO_BACKEND_URL"
echo "   Next.js API URL: $NEXTJS_API_URL"

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure'."
    exit 1
fi

# Check if CloudFormation template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ CloudFormation template not found: $TEMPLATE_FILE"
    exit 1
fi

# Validate CloudFormation template
echo "🔍 Validating CloudFormation template..."
aws cloudformation validate-template --template-body file://$TEMPLATE_FILE > /dev/null
echo "✅ CloudFormation template is valid"

# Check if Cognito User Pool exists
echo "🔍 Verifying Cognito User Pool..."
if aws cognito-idp describe-user-pool --user-pool-id $COGNITO_USER_POOL_ID &> /dev/null; then
    echo "✅ Cognito User Pool verified: $COGNITO_USER_POOL_ID"
else
    echo "⚠️  Warning: Could not verify Cognito User Pool: $COGNITO_USER_POOL_ID"
    echo "   Please ensure the User Pool ID is correct"
fi

echo "✅ Pre-deployment checks passed"

# Prepare CloudFormation parameters
echo "📝 Preparing CloudFormation parameters..."
cat > /tmp/api-gateway-params.json << EOF
[
  {
    "ParameterKey": "CognitoUserPoolId",
    "ParameterValue": "$COGNITO_USER_POOL_ID"
  },
  {
    "ParameterKey": "DjangoBackendUrl",
    "ParameterValue": "$DJANGO_BACKEND_URL"
  },
  {
    "ParameterKey": "NextJSApiUrl",
    "ParameterValue": "$NEXTJS_API_URL"
  },
  {
    "ParameterKey": "Environment",
    "ParameterValue": "$ENVIRONMENT"
  }
]
EOF

# Check if stack already exists
echo "🔍 Checking if CloudFormation stack exists..."
if aws cloudformation describe-stacks --stack-name $STACK_NAME &> /dev/null; then
    echo "📦 Stack exists - performing update..."
    OPERATION="update"
    
    # Create change set first
    CHANGE_SET_NAME="dott-api-gateway-changeset-$(date +%Y%m%d-%H%M%S)"
    echo "🔄 Creating change set: $CHANGE_SET_NAME"
    
    aws cloudformation create-change-set \
        --stack-name $STACK_NAME \
        --change-set-name $CHANGE_SET_NAME \
        --template-body file://$TEMPLATE_FILE \
        --parameters file:///tmp/api-gateway-params.json \
        --capabilities CAPABILITY_IAM \
        --region $AWS_REGION
    
    echo "⏳ Waiting for change set to be created..."
    aws cloudformation wait change-set-create-complete \
        --stack-name $STACK_NAME \
        --change-set-name $CHANGE_SET_NAME \
        --region $AWS_REGION
    
    # Display changes
    echo "📋 Proposed changes:"
    aws cloudformation describe-change-set \
        --stack-name $STACK_NAME \
        --change-set-name $CHANGE_SET_NAME \
        --region $AWS_REGION \
        --query 'Changes[].{Action:Action,Resource:ResourceChange.LogicalResourceId,Type:ResourceChange.ResourceType}' \
        --output table
    
    # Execute change set
    echo "✅ Executing change set..."
    aws cloudformation execute-change-set \
        --stack-name $STACK_NAME \
        --change-set-name $CHANGE_SET_NAME \
        --region $AWS_REGION
    
    WAIT_COMMAND="update-complete"
else
    echo "🆕 Stack does not exist - creating new stack..."
    OPERATION="create"
    
    # Create new stack
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --parameters file:///tmp/api-gateway-params.json \
        --capabilities CAPABILITY_IAM \
        --region $AWS_REGION \
        --tags Key=Application,Value=Dott Key=Environment,Value=$ENVIRONMENT Key=ManagedBy,Value=CloudFormation
    
    WAIT_COMMAND="stack-create-complete"
fi

# Wait for stack operation to complete
echo "⏳ Waiting for stack $OPERATION to complete..."
aws cloudformation wait $WAIT_COMMAND \
    --stack-name $STACK_NAME \
    --region $AWS_REGION

# Check if operation was successful
STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].StackStatus' \
    --output text)

if [[ "$STACK_STATUS" == *"COMPLETE" ]]; then
    echo "✅ Stack $OPERATION completed successfully!"
else
    echo "❌ Stack $OPERATION failed with status: $STACK_STATUS"
    echo "🔍 Recent stack events:"
    aws cloudformation describe-stack-events \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'StackEvents[0:5].{Time:Timestamp,Status:ResourceStatus,Reason:ResourceStatusReason}' \
        --output table
    exit 1
fi

# Get stack outputs
echo "📊 Retrieving deployment information..."
OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs')

API_GATEWAY_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="APIGatewayURL") | .OutputValue')
API_GATEWAY_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="APIGatewayId") | .OutputValue')
COGNITO_AUTHORIZER_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="CognitoAuthorizerId") | .OutputValue')

# Clean up temporary files
rm -f /tmp/api-gateway-params.json

# Create deployment record
DEPLOYMENT_ID=$(date +%Y%m%d-%H%M%S)
cat > "api-gateway-deployment-$DEPLOYMENT_ID.json" << EOF
{
  "deploymentId": "$DEPLOYMENT_ID",
  "timestamp": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')",
  "environment": "$ENVIRONMENT",
  "stackName": "$STACK_NAME",
  "operation": "$OPERATION",
  "apiGatewayUrl": "$API_GATEWAY_URL",
  "apiGatewayId": "$API_GATEWAY_ID",
  "cognitoAuthorizerId": "$COGNITO_AUTHORIZER_ID",
  "configuration": {
    "cognitoUserPoolId": "$COGNITO_USER_POOL_ID",
    "djangoBackendUrl": "$DJANGO_BACKEND_URL",
    "nextjsApiUrl": "$NEXTJS_API_URL"
  },
  "features": {
    "cognitoAuthorization": "enabled",
    "payrollApiProtection": "enabled",
    "rateLimiting": "enabled",
    "corsSupport": "enabled"
  }
}
EOF

echo ""
echo "🎉 Dott API Gateway deployed successfully!"
echo "================================================================"
echo "📊 Deployment Summary:"
echo "   Deployment ID: $DEPLOYMENT_ID"
echo "   Stack Name: $STACK_NAME"
echo "   Operation: $OPERATION"
echo "   Environment: $ENVIRONMENT"
echo ""
echo "🌐 API Gateway Information:"
echo "   API Gateway URL: $API_GATEWAY_URL"
echo "   API Gateway ID: $API_GATEWAY_ID"
echo "   Cognito Authorizer ID: $COGNITO_AUTHORIZER_ID"
echo ""
echo "🔗 Available Endpoints:"
echo "   Payroll Reports:    $API_GATEWAY_URL/payroll/reports"
echo "   Payroll Run:        $API_GATEWAY_URL/payroll/run"
echo "   Payroll Export:     $API_GATEWAY_URL/payroll/export-report"
echo "   Payroll Settings:   $API_GATEWAY_URL/payroll/settings"
echo "   Business APIs:      $API_GATEWAY_URL/business/*"
echo "   Onboarding APIs:    $API_GATEWAY_URL/onboarding/*"
echo ""
echo "🔐 Authentication:"
echo "   All endpoints require valid Cognito JWT token"
echo "   Include 'Authorization: Bearer <token>' header in requests"
echo ""
echo "📈 Rate Limiting:"
echo "   Burst Limit: 100 requests"
echo "   Rate Limit: 50 requests/second"
echo "   Daily Quota: 10,000 requests"
echo ""
echo "🔧 Next Steps:"
echo "   1. Update frontend API base URL to: $API_GATEWAY_URL"
echo "   2. Test authentication with Cognito tokens"
echo "   3. Verify payroll API functionality"
echo "   4. Monitor API usage and performance"
echo ""
echo "📄 Deployment record saved: api-gateway-deployment-$DEPLOYMENT_ID.json" 