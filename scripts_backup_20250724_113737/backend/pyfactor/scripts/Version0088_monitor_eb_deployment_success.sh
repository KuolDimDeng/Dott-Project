#!/bin/bash

# Version0088_monitor_eb_deployment_success.sh
# Monitor the successful EB deployment and provide status updates
# Created: 2025-05-29

set -e

# Configuration
ENVIRONMENT_NAME="Dott-env-fixed"
APPLICATION_NAME="Dott"
VERSION_LABEL="EB-Deploy-Optimized-20250529-085414"

echo "🔍 Monitoring Elastic Beanstalk Deployment"
echo "=============================================="
echo "Environment: $ENVIRONMENT_NAME"
echo "Version: $VERSION_LABEL"
echo "Time: $(date)"
echo ""

# Function to check deployment status
check_deployment_status() {
    echo "📊 Current Environment Status:"
    aws elasticbeanstalk describe-environments \
        --environment-names "$ENVIRONMENT_NAME" \
        --query 'Environments[0].{Status:Status,Health:Health,VersionLabel:VersionLabel}' \
        --output table
    echo ""
    
    echo "🏥 Environment Health Details:"
    aws elasticbeanstalk describe-environment-health \
        --environment-name "$ENVIRONMENT_NAME" \
        --attribute-names Status,Color,Causes \
        --query '{Status:Status,Color:Color,Causes:Causes}' \
        --output table
    echo ""
    
    echo "📋 Recent Events (Last 5):"
    aws elasticbeanstalk describe-events \
        --environment-name "$ENVIRONMENT_NAME" \
        --max-items 5 \
        --query 'Events[].{Time:EventDate,Severity:Severity,Message:Message}' \
        --output table
}

# Function to test endpoint
test_endpoint() {
    local endpoint="Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com"
    echo "🌐 Testing Health Endpoint:"
    echo "GET https://$endpoint/health/"
    
    # Test health endpoint
    if curl -s -f "https://$endpoint/health/" > /dev/null 2>&1; then
        echo "✅ Health endpoint is responding!"
        curl -s "https://$endpoint/health/" | jq '.' 2>/dev/null || echo "Response received"
    else
        echo "⏳ Health endpoint not yet available (this is normal during deployment)"
    fi
    echo ""
}

# Function to check if deployment is complete
is_deployment_complete() {
    local status=$(aws elasticbeanstalk describe-environments \
        --environment-names "$ENVIRONMENT_NAME" \
        --query 'Environments[0].Status' \
        --output text)
    
    if [[ "$status" == "Ready" ]]; then
        return 0
    else
        return 1
    fi
}

# Main monitoring loop
echo "🚀 Starting deployment monitoring..."
echo ""

MAX_WAIT_TIME=1800  # 30 minutes
WAIT_INTERVAL=30    # 30 seconds
elapsed=0

while [ $elapsed -lt $MAX_WAIT_TIME ]; do
    echo "⏰ Elapsed time: ${elapsed}s / ${MAX_WAIT_TIME}s"
    echo "----------------------------------------"
    
    check_deployment_status
    
    if is_deployment_complete; then
        echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
        echo ""
        test_endpoint
        
        echo "📝 Final Deployment Summary:"
        echo "- Environment: $ENVIRONMENT_NAME"
        echo "- Version: $VERSION_LABEL"
        echo "- Status: Ready"
        echo "- Domain: Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com"
        echo "- Total Time: ${elapsed}s"
        echo ""
        echo "✅ Backend deployment is now live and ready for frontend integration!"
        exit 0
    fi
    
    echo "⏳ Deployment still in progress. Waiting ${WAIT_INTERVAL}s..."
    echo ""
    sleep $WAIT_INTERVAL
    elapsed=$((elapsed + WAIT_INTERVAL))
done

echo "⚠️  Deployment monitoring timeout reached (${MAX_WAIT_TIME}s)"
echo "Please check the AWS Console for detailed status."
exit 1
