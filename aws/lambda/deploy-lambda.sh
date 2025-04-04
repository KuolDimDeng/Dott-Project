#!/bin/bash
# Enhanced Lambda deployment script with better error handling and monitoring

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Variables
LAMBDA_FUNCTION_NAME="cognito-post-confirmation-trigger"
ROLE_ARN="${ROLE_ARN:-arn:aws:iam::471112661935:role/lamda-cognito-role}"
REGION="${AWS_REGION:-us-east-1}"
BACKEND_API_URL="${BACKEND_API_URL:-http://localhost:8000}"

# Print header
echo -e "${GREEN}========== Lambda Deployment Script ==========${NC}"
echo -e "Function: ${YELLOW}${LAMBDA_FUNCTION_NAME}${NC}"
echo -e "AWS Region: ${YELLOW}${REGION}${NC}"
echo -e "Backend URL: ${YELLOW}${BACKEND_API_URL}${NC}"
echo -e "Role ARN: ${YELLOW}${ROLE_ARN}${NC}"
echo

# Check for required tools
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

if ! command -v zip &> /dev/null; then
    echo -e "${RED}Error: zip command is not installed. Please install it first.${NC}"
    exit 1
fi

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to install dependencies.${NC}"
    exit 1
fi
echo -e "${GREEN}Dependencies installed successfully.${NC}"

# Create deployment package
echo -e "${GREEN}Creating deployment package...${NC}"
rm -f post-confirmation-trigger.zip
zip -r post-confirmation-trigger.zip post-confirmation-trigger.js index.js node_modules
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to create deployment package.${NC}"
    exit 1
fi
echo -e "${GREEN}Deployment package created successfully.${NC}"

# Check if the function exists
echo -e "${GREEN}Checking if function exists...${NC}"
FUNCTION_EXISTS=$(aws lambda list-functions --region $REGION --query "Functions[?FunctionName=='$LAMBDA_FUNCTION_NAME'].FunctionName" --output text)

if [ -z "$FUNCTION_EXISTS" ]; then
    echo -e "${YELLOW}Function doesn't exist. Creating new Lambda function...${NC}"
    
    # Create the Lambda function
    aws lambda create-function \
        --function-name $LAMBDA_FUNCTION_NAME \
        --runtime nodejs18.x \
        --handler index.handler \
        --zip-file fileb://post-confirmation-trigger.zip \
        --environment "Variables={BACKEND_API_URL=$BACKEND_API_URL}" \
        --role $ROLE_ARN \
        --timeout 30 \
        --region $REGION
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to create Lambda function.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Lambda function created successfully.${NC}"
else
    echo -e "${YELLOW}Function already exists. Updating Lambda function...${NC}"
    
    # Update the Lambda function code
    aws lambda update-function-code \
        --function-name $LAMBDA_FUNCTION_NAME \
        --zip-file fileb://post-confirmation-trigger.zip \
        --region $REGION
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to update Lambda function code.${NC}"
        exit 1
    fi
    
    # Update the Lambda function configuration
    aws lambda update-function-configuration \
        --function-name $LAMBDA_FUNCTION_NAME \
        --handler index.handler \
        --environment "Variables={BACKEND_API_URL=$BACKEND_API_URL}" \
        --timeout 30 \
        --region $REGION
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to update Lambda function configuration.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Lambda function updated successfully.${NC}"
fi

# Add permission for Cognito to invoke Lambda (will fail if already exists, which is fine)
echo -e "${GREEN}Adding permission for Cognito to invoke Lambda...${NC}"
aws lambda add-permission \
    --function-name $LAMBDA_FUNCTION_NAME \
    --statement-id cognito-user-pool \
    --action lambda:InvokeFunction \
    --principal cognito-idp.amazonaws.com \
    --source-arn "arn:aws:cognito-idp:$REGION:*:userpool/*" \
    --region $REGION

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Failed to add permission. This is normal if permission already exists.${NC}"
else
    echo -e "${GREEN}Lambda permission added successfully.${NC}"
fi

# Test the function
echo -e "${GREEN}Testing the Lambda function...${NC}"
aws lambda invoke \
    --function-name $LAMBDA_FUNCTION_NAME \
    --payload '{"version":"1","triggerSource":"PostConfirmation_ConfirmSignUp","region":"us-east-1","userName":"test-user","request":{"userAttributes":{"email":"test@example.com","sub":"test-user-id"}}}' \
    --region $REGION \
    --cli-binary-format raw-in-base64-out \
    /tmp/lambda-output.json

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to test Lambda function.${NC}"
    exit 1
fi

echo -e "${GREEN}Lambda function tested successfully. Output:${NC}"
cat /tmp/lambda-output.json
echo

# Success message and next steps
echo -e "${GREEN}========== Deployment Complete ==========${NC}"
echo -e "${YELLOW}Important Next Steps:${NC}"
echo -e "1. Ensure your Cognito User Pool has this Lambda function configured as a Post Confirmation trigger."
echo -e "2. Check CloudWatch logs for your Lambda function to monitor its operation."
echo -e "3. Verify the Lambda function can reach your backend at: ${BACKEND_API_URL}"
echo
echo -e "${GREEN}Lambda Function ARN:${NC} $(aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)"
echo -e "${GREEN}CloudWatch Logs:${NC} https://${REGION}.console.aws.amazon.com/cloudwatch/home?region=${REGION}#logsV2:log-groups/log-group/\$252Faws\$252Flambda\$252F${LAMBDA_FUNCTION_NAME}" 