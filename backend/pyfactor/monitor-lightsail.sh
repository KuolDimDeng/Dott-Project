#!/bin/bash

# Load configuration
source lightsail-config.sh

echo "============================================="
echo " 📊 MONITORING LIGHTSAIL DEPLOYMENT"
echo "============================================="

echo "ℹ️  Service Name: $SERVICE_NAME"
echo "ℹ️  Service URL: https://$SERVICE_URL"
echo "ℹ️  Health Check: https://$SERVICE_URL/health/"
echo "ℹ️  Region: $REGION"

echo ""
echo "Starting monitoring... (Press Ctrl+C to stop)"
echo ""

# Function to get deployment status
get_deployment_status() {
    aws lightsail get-container-services \
        --service-name "$SERVICE_NAME" \
        --region "$REGION" \
        --query 'containerServices[0].currentDeployment.state' \
        --output text 2>/dev/null
}

# Function to get service status
get_service_status() {
    aws lightsail get-container-services \
        --service-name "$SERVICE_NAME" \
        --region "$REGION" \
        --query 'containerServices[0].state' \
        --output text 2>/dev/null
}

# Function to test health endpoint
test_health() {
    echo "Testing health endpoint..."
    curl -s -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" "https://$SERVICE_URL/health/" || echo "❌ Health check failed"
}

while true; do
    SERVICE_STATE=$(get_service_status)
    DEPLOYMENT_STATE=$(get_deployment_status)
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$TIMESTAMP] Service: $SERVICE_STATE | Deployment: $DEPLOYMENT_STATE"
    
    case $DEPLOYMENT_STATE in
        "ACTIVE")
            echo "✅ Deployment is ACTIVE!"
            echo ""
            test_health
            echo ""
            echo "🎉 YOUR APP IS LIVE!"
            echo "🌐 App URL: https://$SERVICE_URL"
            echo "🔍 Health Check: https://$SERVICE_URL/health/"
            echo "📊 Lightsail Console: https://lightsail.aws.amazon.com/ls/webapp/home/containers"
            echo ""
            echo "💰 Monthly Cost: ~$20"
            echo "📈 Auto-scaling: Included"
            echo "🔒 SSL Certificate: Included"
            echo "⚖️ Load Balancer: Included"
            break
            ;;
        "FAILED")
            echo "❌ Deployment FAILED!"
            echo ""
            echo "Check the logs in Lightsail console:"
            echo "https://lightsail.aws.amazon.com/ls/webapp/home/containers"
            break
            ;;
        "ACTIVATING")
            echo "🔄 Deployment is activating..."
            ;;
        *)
            echo "📊 Status: $DEPLOYMENT_STATE"
            ;;
    esac
    
    sleep 15
done 