#!/bin/bash

echo "🔍 Simple Status Check..."

# Check environment health
echo "Environment Health Status:"
aws elasticbeanstalk describe-environments \
  --environment-names DottApps-Max-Security-Fixed \
  --region us-east-1 \
  > status.json 2>&1

if [ $? -eq 0 ]; then
  grep -o '"Health":"[^"]*"' status.json || echo "No health status found"
  grep -o '"Status":"[^"]*"' status.json || echo "No status found"
else
  echo "Failed to get environment status"
fi

echo ""
echo "Target Health Status:"
aws elbv2 describe-target-health \
  --target-group-arn "arn:aws:elasticloadbalancing:us-east-1:471112661935:targetgroup/awseb-AWSEB-HQDF0W7JHW2S/c7991fc04864c0b5" \
  --region us-east-1 \
  > health.json 2>&1

if [ $? -eq 0 ]; then
  grep -o '"State":"[^"]*"' health.json || echo "No target state found"
  grep -o '"Reason":"[^"]*"' health.json || echo "No reason found"
else
  echo "Failed to get target health"
fi

echo ""
echo "Done." 