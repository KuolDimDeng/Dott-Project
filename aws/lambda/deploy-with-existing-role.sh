#!/bin/bash
# Modified deployment script for Cognito post-confirmation Lambda function
# This version works with existing roles and minimal IAM permissions

# Variables
LAMBDA_FUNCTION_NAME="cognito-post-confirmation-trigger"
ROLE_ARN="${ROLE_ARN:-arn:aws:iam::471112661935:role/lambda-cognito-role}"
REGION="${AWS_REGION:-us-east-1}"
BACKEND_API_URL="${BACKEND_API_URL:-http://localhost:8000}"
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)

echo "Using AWS Account ID: $ACCOUNT_ID"
echo "Using AWS Region: $REGION"
echo "Using Backend API URL: $BACKEND_API_URL"
echo "Using IAM Role ARN: $ROLE_ARN"

# Check if the IAM role ARN is valid
if [ -z "$ROLE_ARN" ]; then
  echo "ERROR: You must provide a valid IAM role ARN via the ROLE_ARN environment variable"
  echo "Example: ROLE_ARN=arn:aws:iam::123456789012:role/existing-lambda-role ./deploy-with-existing-role.sh"
  exit 1
fi

# Install dependencies
npm install

# Create deployment package
rm -f post-confirmation-trigger.zip
zip -r post-confirmation-trigger.zip post-confirmation-trigger.js node_modules

# Check if the function already exists
FUNCTION_EXISTS=$(aws lambda list-functions --query "Functions[?FunctionName=='$LAMBDA_FUNCTION_NAME'].FunctionName" --output text)

if [ -z "$FUNCTION_EXISTS" ]; then
  echo "Creating new Lambda function..."
  # Create the Lambda function
  aws lambda create-function \
    --function-name $LAMBDA_FUNCTION_NAME \
    --runtime nodejs18.x \
    --handler post-confirmation-trigger.handler \
    --zip-file fileb://post-confirmation-trigger.zip \
    --environment "Variables={BACKEND_API_URL=$BACKEND_API_URL}" \
    --role $ROLE_ARN \
    --timeout 30 \
    --region $REGION
else
  echo "Updating existing Lambda function..."
  # Update the Lambda function code
  aws lambda update-function-code \
    --function-name $LAMBDA_FUNCTION_NAME \
    --zip-file fileb://post-confirmation-trigger.zip \
    --region $REGION
  
  # Update the Lambda function configuration
  aws lambda update-function-configuration \
    --function-name $LAMBDA_FUNCTION_NAME \
    --environment "Variables={BACKEND_API_URL=$BACKEND_API_URL}" \
    --timeout 30 \
    --region $REGION
fi

echo "Deployment completed!"
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "1. Make sure the Lambda role has the following permissions:"
echo "   - Lambda execution (AWSLambdaBasicExecutionRole)"
echo "   - Cognito User Pool access"
echo "   - HTTP/HTTPS access for your backend"
echo ""
echo "2. Configure Cognito to trigger this Lambda on Post Confirmation:"
echo "   - Go to AWS Console > Cognito > User Pools"
echo "   - Select your User Pool (us-east-1_JPL8vGfb6)"
echo "   - Go to 'User Pool Properties' > 'Triggers'"
echo "   - Set 'Post confirmation' trigger to: $LAMBDA_FUNCTION_NAME"
echo "   - Save changes"
echo ""
echo "3. Test the entire flow by registering a new user" 