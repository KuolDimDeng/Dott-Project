#!/bin/bash

# Monitor Deployment Status
echo "🔍 Monitoring Deployment Status..."

# Check environment status
echo "📊 Environment Status:"
aws elasticbeanstalk describe-environments \
  --environment-names DottApps-Max-Security-Fixed \
  --region us-east-1 \
  --output json > env-status.json

if [ -f env-status.json ]; then
  echo "Environment JSON saved to env-status.json"
  cat env-status.json
else
  echo "Failed to get environment status"
fi

echo ""
echo "🎯 Target Health Status:"
aws elbv2 describe-target-health \
  --target-group-arn "arn:aws:elasticloadbalancing:us-east-1:471112661935:targetgroup/awseb-AWSEB-HQDF0W7JHW2S/c7991fc04864c0b5" \
  --region us-east-1 \
  --output json > target-health.json

if [ -f target-health.json ]; then
  echo "Target health JSON saved to target-health.json"
  cat target-health.json
else
  echo "Failed to get target health"
fi

echo ""
echo "✅ Monitoring complete. Check the JSON files for details." 