#!/bin/bash

# Fix ALB Health Check Configuration Script
# The issue is ALB is trying to use HTTPS for health checks when backend serves HTTP

set -e
echo "🔧 Fixing ALB health check configuration..."

# Use EB configuration update approach (more reliable)
echo "🔄 Updating health check via EB configuration..."
aws elasticbeanstalk update-environment \
  --environment-name "DottApps-Max-Security-Fixed" \
  --region us-east-1 \
  --option-settings \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=HealthCheckPath,Value=/health/ \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=Port,Value=8000 \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=Protocol,Value=HTTP \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=HealthCheckInterval,Value=30 \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=HealthCheckTimeout,Value=5 \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=HealthyThresholdCount,Value=2 \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=UnhealthyThresholdCount,Value=5

echo "✅ Health check configuration updated!"
echo "⏳ Waiting for configuration to apply..."
echo "📊 This may take 2-3 minutes to show as healthy"

# Monitor the environment status
echo "📊 Monitoring environment status..."
for i in {1..20}; do
  STATUS=$(aws elasticbeanstalk describe-environments \
    --environment-names "DottApps-Max-Security-Fixed" \
    --region us-east-1 \
    --query 'Environments[0].Status' \
    --output text 2>/dev/null || echo "Updating")
  
  HEALTH=$(aws elasticbeanstalk describe-environments \
    --environment-names "DottApps-Max-Security-Fixed" \
    --region us-east-1 \
    --query 'Environments[0].Health' \
    --output text 2>/dev/null || echo "Unknown")
  
  echo "Status: $STATUS | Health: $HEALTH"
  
  if [[ "$STATUS" == "Ready" && ("$HEALTH" == "Green" || "$HEALTH" == "Ok") ]]; then
    echo "🎉 SUCCESS! Environment is healthy"
    echo "🔗 Test URL: https://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/"
    break
  fi
  
  sleep 30
done

echo "🏁 Configuration update complete. Check AWS console for final status." 