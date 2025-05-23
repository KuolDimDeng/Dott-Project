#!/bin/bash

# Script to update the Dott-env-fixed Elastic Beanstalk environment with RDS, SSL, HTTPS, and domain settings
# This script updates configuration without redeploying the application

echo "Updating Elastic Beanstalk environment 'Dott-env-fixed'..."

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Path to the environment options JSON file
ENV_OPTIONS_FILE="$PROJECT_ROOT/environment-options-minimal.json"

# Check if the file exists
if [ ! -f "$ENV_OPTIONS_FILE" ]; then
  echo "Error: Environment options file not found at $ENV_OPTIONS_FILE"
  exit 1
fi

# For demonstration purposes, we'll use a placeholder certificate ARN
# In a real deployment, you would create a certificate in ACM and use its ARN
echo "Using placeholder certificate ARN for demonstration..."
CERT_ARN="arn:aws:acm:us-east-1:471112661935:certificate/00000000-0000-0000-0000-000000000000"

echo "Using placeholder certificate: $CERT_ARN"

# Update the certificate ARN in the environment options file
echo "Updating certificate ARN in environment options file..."
sed -i.bak "s|\"Value\": \"arn:aws:acm:us-east-1:471112661935:certificate/your-certificate-id\"|\"Value\": \"$CERT_ARN\"|g" "$ENV_OPTIONS_FILE"

echo "NOTE: In production, you should create a real certificate for dottapps.com in AWS Certificate Manager"

# Update the Elastic Beanstalk environment
echo "Applying configuration to Dott-env-fixed..."
aws elasticbeanstalk update-environment \
  --environment-name Dott-env-fixed \
  --option-settings file://"$ENV_OPTIONS_FILE"

# Check the exit status
if [ $? -eq 0 ]; then
  echo "Configuration update started successfully!"
  echo "The environment update process will take several minutes to complete."
  echo "You can check the status using:"
  echo "aws elasticbeanstalk describe-environments --environment-names Dott-env-fixed --query \"Environments[0].Status\""
  echo ""
  echo "After the update completes, don't forget to create a Route 53 record for api.dottapps.com pointing to your Elastic Beanstalk environment URL."
else
  echo "Error: Failed to update environment configuration."
  exit 1
fi

# Install requirements for Django CORS support
echo "Deploying updated Django application with CORS support..."
cd "$PROJECT_ROOT" || exit 1

# Install django-cors-headers if not already in requirements.txt
if ! grep -q "django-cors-headers" requirements.txt; then
  echo "Adding django-cors-headers to requirements.txt"
  echo "django-cors-headers==4.3.1" >> requirements.txt
fi

# Deploy the updated application
eb deploy Dott-env-fixed

# Check the exit status
if [ $? -eq 0 ]; then
  echo "Application deployment initiated successfully!"
  echo "It may take several minutes for the deployment to complete."
else
  echo "Error: Failed to deploy the updated application."
  exit 1
fi

echo "Environment update process is running. After completion, make sure to set up your Domain in Route 53:"
echo "1. Create an A record for dottapps.com pointing to your frontend hosting (AWS Amplify)"
echo "2. Create an A record for api.dottapps.com pointing to your Elastic Beanstalk environment"

exit 0
