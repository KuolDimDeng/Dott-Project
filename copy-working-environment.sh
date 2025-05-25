#!/bin/bash

# Copy Working Environment to HTTPS Environment Script
# This bypasses Docker build issues by using the working deployment

set -e
echo "🔄 Copying working environment to HTTPS environment..."

# Get the working application version from Dott-env-fixed
echo "📋 Getting working application version..."
WORKING_VERSION=$(aws elasticbeanstalk describe-environments \
  --environment-names "Dott-env-fixed" \
  --region us-east-1 \
  --query 'Environments[0].VersionLabel' \
  --output text)

echo "✅ Working version: $WORKING_VERSION"

# Deploy the working version to our HTTPS environment
echo "🚀 Deploying working version to DottApps-Max-Security-Fixed..."
aws elasticbeanstalk update-environment \
  --environment-name "DottApps-Max-Security-Fixed" \
  --version-label "$WORKING_VERSION" \
  --region us-east-1

echo "⏳ Deployment started. This will use the exact same code that works in Dott-env-fixed"
echo "🔐 The environment already has HTTPS configured via ALB + SSL certificate"
echo "⏰ Wait 3-5 minutes for deployment to complete"

# Monitor deployment
echo "📊 Monitoring deployment status..."
for i in {1..20}; do
  STATUS=$(aws elasticbeanstalk describe-environments \
    --environment-names "DottApps-Max-Security-Fixed" \
    --region us-east-1 \
    --query 'Environments[0].Status' \
    --output text)
  
  HEALTH=$(aws elasticbeanstalk describe-environments \
    --environment-names "DottApps-Max-Security-Fixed" \
    --region us-east-1 \
    --query 'Environments[0].Health' \
    --output text)
  
  echo "Status: $STATUS | Health: $HEALTH"
  
  if [[ "$STATUS" == "Ready" && "$HEALTH" == "Green" ]]; then
    echo "🎉 SUCCESS! Environment is ready and healthy"
    echo "🔗 Test URL: https://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/"
    break
  fi
  
  if [[ "$STATUS" == "Ready" && "$HEALTH" != "Red" ]]; then
    echo "✅ Deployment complete, health improving..."
  fi
  
  sleep 30
done

echo "🏁 Deployment process complete. Check AWS console for final status." 