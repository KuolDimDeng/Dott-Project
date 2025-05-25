#!/bin/bash

# Simple HTTPS Backend Deployment Script
# Updates existing environment with HTTPS configuration

set -e

echo "🔒 Enabling HTTPS on existing backend environment..."

# Configuration
ENV_NAME="Dott-env-fixed"
REGION="us-east-1"

echo "📝 Updating environment configuration with HTTPS..."

# Update the environment to add HTTPS listener
aws elasticbeanstalk update-environment \
    --environment-name "$ENV_NAME" \
    --option-settings \
        Namespace=aws:elbv2:listener:443,OptionName=Protocol,Value=HTTPS \
        Namespace=aws:elbv2:listener:443,OptionName=SSLCertificateArns,Value=arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810 \
    --region "$REGION"

echo "⏳ Waiting for environment update to complete..."
echo "This may take 5-10 minutes..."

# Monitor the update
aws elasticbeanstalk wait environment-updated \
    --environment-name "$ENV_NAME" \
    --region "$REGION"

# Get environment URL
ENV_URL=$(aws elasticbeanstalk describe-environments \
    --environment-names "$ENV_NAME" \
    --region "$REGION" \
    --query 'Environments[0].CNAME' \
    --output text)

echo ""
echo "🎉 HTTPS Configuration Completed!"
echo "=================================="
echo "Environment: $ENV_NAME"
echo "HTTP URL: http://$ENV_URL"
echo "HTTPS URL: https://$ENV_URL"
echo ""
echo "🔗 Test HTTPS endpoint:"
echo "curl https://$ENV_URL/health/"
echo ""
echo "✅ Your backend now supports both HTTP and HTTPS!" 