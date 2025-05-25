#!/bin/bash

# Modify ALB Health Check for Django Health Endpoint
# Changes health check path from "/" to "/health/" 
# This is the simplest fix - no Django/Docker changes needed

set -e
echo "🎯 ALB Health Check Modification..."

# Target group ARN from previous logs
TARGET_GROUP_ARN="arn:aws:elasticloadbalancing:us-east-1:471112661935:targetgroup/awseb-AWSEB-HQDF0W7JHW2S/c7991fc04864c0b5"

echo ""
echo "📋 **Current Health Check Configuration:**"
echo "   Checking current settings..."

# Get current configuration
aws elbv2 describe-target-groups \
  --target-group-arns "$TARGET_GROUP_ARN" \
  --region us-east-1 \
  --query 'TargetGroups[0].{HealthCheckPath:HealthCheckPath,HealthCheckPort:HealthCheckPort,HealthCheckProtocol:HealthCheckProtocol,HealthCheckIntervalSeconds:HealthCheckIntervalSeconds,HealthyThresholdCount:HealthyThresholdCount,UnhealthyThresholdCount:UnhealthyThresholdCount}' \
  --output table

echo ""
echo "🔧 **Modifying Health Check Configuration:**"
echo "   Changing health check path from '/' to '/health/'"

# Modify health check to use Django health endpoint
aws elbv2 modify-target-group \
  --target-group-arn "$TARGET_GROUP_ARN" \
  --health-check-path "/health/" \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region us-east-1

echo ""
echo "✅ **Health Check Modified Successfully!**"
echo ""
echo "📋 **New Health Check Configuration:**"

# Verify the change
aws elbv2 describe-target-groups \
  --target-group-arns "$TARGET_GROUP_ARN" \
  --region us-east-1 \
  --query 'TargetGroups[0].{HealthCheckPath:HealthCheckPath,HealthCheckPort:HealthCheckPort,HealthCheckProtocol:HealthCheckProtocol,HealthCheckIntervalSeconds:HealthCheckIntervalSeconds,HealthyThresholdCount:HealthyThresholdCount,UnhealthyThresholdCount:UnhealthyThresholdCount}' \
  --output table

echo ""
echo "🎯 **What Changed:**"
echo "   ✅ Health check path: '/' → '/health/'"
echo "   ✅ Health check interval: 30 seconds"
echo "   ✅ Health check timeout: 5 seconds"
echo "   ✅ Healthy threshold: 2 consecutive successes"
echo "   ✅ Unhealthy threshold: 3 consecutive failures"
echo ""
echo "⏳ **Expected Results (in 1-2 minutes):**"
echo "   • ALB will start checking Django's /health/ endpoint"
echo "   • Health checks should start passing immediately"
echo "   • Environment health should improve from 'Severe' to 'OK'"
echo "   • No Django container restarts or deployments needed"
echo ""
echo "🧪 **Test the health endpoint:**"
echo "   curl http://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/"
echo ""
echo "🎉 **Benefits of this approach:**"
echo "   • No risky deployments"
echo "   • Django application unchanged"
echo "   • Uses existing working health endpoint"
echo "   • Immediate effect" 