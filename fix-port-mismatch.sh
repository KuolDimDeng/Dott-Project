#!/bin/bash

# Fix Port Mismatch - ALB should check nginx on port 80, not Django on port 8000
# The nginx config shows it's listening on port 80 and proxying to Django on 8000

set -e
echo "🔧 Fixing Port Mismatch..."

# The issue: ALB is trying to check Django directly on port 8000
# The solution: ALB should check nginx on port 80, which will proxy to Django

echo "📊 Current situation analysis:"
echo "   • Nginx is listening on port 80 ✅"
echo "   • Nginx has /health/ proxy to Django ✅"
echo "   • Django is running on port 8000 ✅"
echo "   • ALB is checking port 8000 directly ❌"
echo ""
echo "🔧 Solution: Configure ALB to check nginx on port 80"

# Get the target group ARN
TG_ARN="arn:aws:elasticloadbalancing:us-east-1:471112661935:targetgroup/awseb-AWSEB-HQDF0W7JHW2S/c7991fc04864c0b5"

# First, let's see the current configuration
echo "📋 Current target group configuration:"
aws elbv2 describe-target-groups \
  --target-group-arns "$TG_ARN" \
  --region us-east-1 \
  --query 'TargetGroups[0].{Port:Port,HealthCheckPort:HealthCheckPort,HealthCheckPath:HealthCheckPath}' \
  --output table

echo ""
echo "📋 Current target registration:"
aws elbv2 describe-target-health \
  --target-group-arn "$TG_ARN" \
  --region us-east-1 \
  --query 'TargetHealthDescriptions[*].{Instance:Target.Id,Port:Target.Port,HealthPort:HealthCheckPort,Status:TargetHealth.State}' \
  --output table

# The fix: Update health check to use port 80 (nginx) instead of port 8000 (Django direct)
echo ""
echo "🔧 Updating ALB health check to use nginx on port 80..."

aws elbv2 modify-target-group \
  --target-group-arn "$TG_ARN" \
  --health-check-port "80" \
  --health-check-path "/health/" \
  --health-check-protocol "HTTP" \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region us-east-1

echo "✅ Updated ALB health check to use nginx on port 80"

# Also need to check if the target is registered on the right port
echo ""
echo "🔍 Checking target registration..."

# Get current target registration
CURRENT_TARGETS=$(aws elbv2 describe-target-health \
  --target-group-arn "$TG_ARN" \
  --region us-east-1 \
  --query 'TargetHealthDescriptions[0].Target' \
  --output json)

INSTANCE_ID=$(echo "$CURRENT_TARGETS" | jq -r '.Id')
CURRENT_PORT=$(echo "$CURRENT_TARGETS" | jq -r '.Port')

echo "Instance ID: $INSTANCE_ID"
echo "Current Port: $CURRENT_PORT"

# If the target is registered on port 8000, we need to re-register it on port 80
if [[ "$CURRENT_PORT" == "8000" ]]; then
    echo ""
    echo "🔄 Re-registering target on port 80..."
    
    # Deregister from port 8000
    aws elbv2 deregister-targets \
      --target-group-arn "$TG_ARN" \
      --targets Id="$INSTANCE_ID",Port=8000 \
      --region us-east-1
    
    echo "⏳ Waiting for deregistration..."
    sleep 10
    
    # Register on port 80
    aws elbv2 register-targets \
      --target-group-arn "$TG_ARN" \
      --targets Id="$INSTANCE_ID",Port=80 \
      --region us-east-1
    
    echo "✅ Re-registered target on port 80"
else
    echo "✅ Target is already registered on port $CURRENT_PORT"
fi

echo ""
echo "🎉 Port Configuration Fixed!"
echo ""
echo "📊 **Updated configuration:**"
echo "   • ALB health check: nginx on port 80"
echo "   • Health check path: /health/"
echo "   • Nginx proxy: /health/ → Django:8000/health/"
echo "   • Target registration: Instance on port 80"
echo ""
echo "⏳ **Expected timeline:**"
echo "   • Target registration: 30-60 seconds"
echo "   • Health check stabilization: 60-120 seconds"
echo "   • Environment healthy: 3-5 minutes"
echo ""

# Wait and check status
echo "⏳ Waiting 90 seconds for changes to take effect..."
sleep 90

echo "🔍 Checking target health status..."
aws elbv2 describe-target-health \
  --target-group-arn "$TG_ARN" \
  --region us-east-1 \
  --query 'TargetHealthDescriptions[*].{Instance:Target.Id,Port:Target.Port,Health:TargetHealth.State,Reason:TargetHealth.Reason}' \
  --output table

echo ""
echo "💡 **What should happen now:**"
echo "   1. ALB sends health check to nginx on port 80"
echo "   2. Nginx receives /health/ request"
echo "   3. Nginx proxies to Django on port 8000"
echo "   4. Django responds with health status"
echo "   5. ALB marks target as healthy"
echo ""
echo "🏁 Port mismatch fix completed!" 