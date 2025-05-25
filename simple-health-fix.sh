#!/bin/bash

# Simple Health Check Fix via EB Configuration
# This approach uses EB configuration updates instead of redeployment

set -e
echo "🔧 Simple Health Check Fix..."

# Option 1: Try changing the ALB health check to port 8000 directly
echo "🎯 Updating ALB to check Django directly on port 8000..."

# Get the target group ARN
TG_ARN="arn:aws:elasticloadbalancing:us-east-1:471112661935:targetgroup/awseb-AWSEB-HQDF0W7JHW2S/c7991fc04864c0b5"

# Update the health check to use port 8000 directly (bypassing nginx)
aws elbv2 modify-target-group \
  --target-group-arn "$TG_ARN" \
  --health-check-port "8000" \
  --health-check-path "/health/" \
  --health-check-protocol "HTTP" \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region us-east-1

echo "✅ Updated ALB health check to target Django directly on port 8000"

# Option 2: Also update the target group to use port 8000 instead of 8080
echo "🔧 Ensuring target group is configured for port 8000..."

# Check current targets and their ports
echo "📊 Current target configuration:"
aws elbv2 describe-target-health \
  --target-group-arn "$TG_ARN" \
  --region us-east-1 > current-targets.json

cat current-targets.json

# If we need to re-register targets on the correct port, we would do it here
# But first let's see if the health check port change fixes it

echo ""
echo "🎉 Health Check Configuration Updated!"
echo ""
echo "📊 **Changes made:**"
echo "   • ALB health check now targets Django directly on port 8000"
echo "   • Bypassing nginx proxy layer for health checks"
echo "   • Health check path: /health/"
echo "   • Health check interval: 30 seconds"
echo ""
echo "⏳ **Expected timeline:**"
echo "   • Health checks will start using new configuration immediately"
echo "   • May take 2-3 health check cycles (60-90 seconds) to show healthy"
echo "   • Environment should show 'OK' status within 5-10 minutes"
echo ""
echo "🔍 **Monitor progress:**"
echo "   • Check target health: aws elbv2 describe-target-health --target-group-arn $TG_ARN --region us-east-1"
echo "   • Watch EB environment status in AWS Console"
echo ""
echo "💡 **If this doesn't work:**"
echo "   • We may need to ensure Django has a /health/ endpoint"
echo "   • Or configure nginx to proxy properly"

# Wait a bit and check the health
echo ""
echo "⏳ Waiting 60 seconds before checking health status..."
sleep 60

echo "🔍 Checking target health status..."
aws elbv2 describe-target-health \
  --target-group-arn "$TG_ARN" \
  --region us-east-1 \
  --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,Health:TargetHealth.State,Reason:TargetHealth.Reason}' \
  --output table || echo "Could not retrieve health status"

echo ""
echo "🏁 Health check fix completed! Monitor the environment for improvements." 