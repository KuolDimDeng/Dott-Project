#!/bin/bash
# Deployment script for Cognito post-confirmation Lambda function

# Variables
LAMBDA_FUNCTION_NAME="cognito-post-confirmation-trigger"
ROLE_NAME="lambda-cognito-role"
REGION="${AWS_REGION:-us-east-1}"
BACKEND_API_URL="${BACKEND_API_URL:-http://localhost:8000}"
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)

echo "Using AWS Account ID: $ACCOUNT_ID"
echo "Using AWS Region: $REGION"
echo "Using Backend API URL: $BACKEND_API_URL"

# Install dependencies
npm install

# Create deployment package
rm -f post-confirmation-trigger.zip
zip -r post-confirmation-trigger.zip post-confirmation-trigger.js node_modules

# Create a temporary trust policy with account ID replaced
cat trust-policy.json | sed "s/\${AWS::AccountId}/$ACCOUNT_ID/g" > /tmp/trust-policy-processed.json

# Create IAM role if it doesn't exist
ROLE_EXISTS=$(aws iam list-roles --query "Roles[?RoleName=='$ROLE_NAME'].RoleName" --output text)

if [ -z "$ROLE_EXISTS" ]; then
  echo "Creating IAM role $ROLE_NAME..."
  
  # Create the role with processed trust policy
  aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file:///tmp/trust-policy-processed.json
  
  # Attach the policy to the role
  aws iam put-role-policy \
    --role-name $ROLE_NAME \
    --policy-name lambda-cognito-permissions \
    --policy-document file://lambda-role-policy.json
  
  # Wait for role to propagate
  echo "Waiting for IAM role to propagate..."
  sleep 10
else
  echo "IAM role $ROLE_NAME already exists."
  
  # Update the role policies
  aws iam put-role-policy \
    --role-name $ROLE_NAME \
    --policy-name lambda-cognito-permissions \
    --policy-document file://lambda-role-policy.json
  
  # Update trust policy
  aws iam update-assume-role-policy \
    --role-name $ROLE_NAME \
    --policy-document file:///tmp/trust-policy-processed.json
fi

# Get the role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query "Role.Arn" --output text)
echo "Using Role ARN: $ROLE_ARN"

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
    --role $ROLE_ARN \
    --timeout 30 \
    --region $REGION
fi

# Give Lambda function permission to be invoked by Cognito
echo "Adding permission for Cognito to invoke Lambda..."
aws lambda add-permission \
  --function-name $LAMBDA_FUNCTION_NAME \
  --statement-id cognito-user-pool \
  --action lambda:InvokeFunction \
  --principal cognito-idp.amazonaws.com \
  --source-arn "arn:aws:cognito-idp:$REGION:$ACCOUNT_ID:userpool/*"

# Configure Cognito User Pool to use this Lambda function
echo "To complete setup, add the Lambda trigger to your Cognito User Pool:"
echo "1. Go to the AWS Console > Cognito > User Pools"
echo "2. Select your User Pool"
echo "3. Go to 'User Pool Properties' > 'Triggers'"
echo "4. Set the 'Post confirmation' trigger to: $LAMBDA_FUNCTION_NAME"
echo "5. Save changes"

echo "Deployment completed!"
echo ""
echo "IMPORTANT:"
echo "1. Set the correct BACKEND_API_URL environment variable"
echo "2. Make sure the Lambda role has proper permissions"
echo "3. Configure Cognito to trigger this Lambda on Post Confirmation"
echo "4. Test the entire flow by registering a new user" 