#!/bin/bash

SERVICE_ARN="arn:aws:apprunner:us-east-1:471112661935:service/dott-backend/234f661f37cb42ea9b11b02df760a687"
SERVICE_URL="https://umuhxnvsek.us-east-1.awsapprunner.com"
HEALTH_URL="$SERVICE_URL/health/"

echo "============================================="
echo " 📊 MONITORING APP RUNNER (MINIMAL)"
echo "============================================="
echo "Service ARN: $SERVICE_ARN"
echo "Service URL: $SERVICE_URL"
echo "Health Check: $HEALTH_URL"
echo "Image: public.ecr.aws/v2s7l6f3/dott-backend-public:minimal"
echo "Type: Pure Python Health Server (No Django)"
echo ""

# Function to get service status
get_status() {
    aws apprunner describe-service --service-arn "$SERVICE_ARN" --query 'Service.Status' --output text 2>/dev/null
}

# Function to test health endpoint
test_health() {
    echo "Testing health endpoint..."
    curl -s -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" "$HEALTH_URL" || echo "❌ Health check failed"
}

echo "Starting monitoring... (Press Ctrl+C to stop)"
echo ""

while true; do
    STATUS=$(get_status)
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $STATUS in
        "RUNNING")
            echo "[$TIMESTAMP] ✅ Status: $STATUS"
            echo "Testing health endpoint..."
            test_health
            echo ""
            echo "🎉 MINIMAL SERVICE IS RUNNING!"
            echo "Service URL: $SERVICE_URL"
            echo "Health Check: $HEALTH_URL"
            echo ""
            echo "This proves App Runner works! The issue was with Django dependencies."
            echo ""
            echo "Try accessing the health endpoint:"
            echo "curl $HEALTH_URL"
            echo ""
            echo "🔗 App Runner Console:"
            echo "https://console.aws.amazon.com/apprunner/home?region=us-east-1#/services"
            break
            ;;
        "CREATE_FAILED"|"DELETE_FAILED"|"UPDATE_FAILED_ROLLBACK_COMPLETE")
            echo "[$TIMESTAMP] ❌ Status: $STATUS"
            echo ""
            echo "Even minimal deployment failed! This suggests an App Runner configuration issue."
            echo "Check logs:"
            echo "aws logs describe-log-streams --log-group-name '/aws/apprunner/dott-backend' --region us-east-1"
            break
            ;;
        "DELETED")
            echo "[$TIMESTAMP] 🗑️  Status: $STATUS"
            echo "Service has been deleted."
            break
            ;;
        "OPERATION_IN_PROGRESS")
            echo "[$TIMESTAMP] 🔄 Status: $STATUS (deploying...)"
            ;;
        *)
            echo "[$TIMESTAMP] 📊 Status: $STATUS"
            ;;
    esac
    
    sleep 10
done 