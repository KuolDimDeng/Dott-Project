#!/bin/bash

# Load configuration
source fargate-config.sh

echo "============================================="
echo " 📊 MONITORING FARGATE DEPLOYMENT"
echo "============================================="

echo "ℹ️  Cluster: $CLUSTER_NAME"
echo "ℹ️  Service: $SERVICE_NAME"
echo "ℹ️  Region: $REGION"

echo ""
echo "Starting monitoring... (Press Ctrl+C to stop)"
echo ""

# Function to get service status
get_service_status() {
    aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --region "$REGION" \
        --query 'services[0].status' \
        --output text 2>/dev/null
}

# Function to get running task count
get_running_tasks() {
    aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --region "$REGION" \
        --query 'services[0].runningCount' \
        --output text 2>/dev/null
}

# Function to get desired task count
get_desired_tasks() {
    aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --region "$REGION" \
        --query 'services[0].desiredCount' \
        --output text 2>/dev/null
}

# Function to get task ARN
get_task_arn() {
    aws ecs list-tasks \
        --cluster "$CLUSTER_NAME" \
        --service-name "$SERVICE_NAME" \
        --region "$REGION" \
        --query 'taskArns[0]' \
        --output text 2>/dev/null
}

# Function to get public IP
get_public_ip() {
    TASK_ARN=$(get_task_arn)
    if [ "$TASK_ARN" != "None" ] && [ "$TASK_ARN" != "" ]; then
        NETWORK_INTERFACE_ID=$(aws ecs describe-tasks \
            --cluster "$CLUSTER_NAME" \
            --tasks "$TASK_ARN" \
            --region "$REGION" \
            --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
            --output text 2>/dev/null)
        
        if [ "$NETWORK_INTERFACE_ID" != "" ] && [ "$NETWORK_INTERFACE_ID" != "None" ]; then
            aws ec2 describe-network-interfaces \
                --network-interface-ids "$NETWORK_INTERFACE_ID" \
                --region "$REGION" \
                --query 'NetworkInterfaces[0].Association.PublicIp' \
                --output text 2>/dev/null
        fi
    fi
}

# Function to test health endpoint
test_health() {
    PUBLIC_IP=$(get_public_ip)
    if [ "$PUBLIC_IP" != "" ] && [ "$PUBLIC_IP" != "None" ]; then
        echo "Testing health endpoint at $PUBLIC_IP:8000..."
        curl -s -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" "http://$PUBLIC_IP:8000/health/" || echo "❌ Health check failed"
    fi
}

while true; do
    SERVICE_STATUS=$(get_service_status)
    RUNNING_TASKS=$(get_running_tasks)
    DESIRED_TASKS=$(get_desired_tasks)
    PUBLIC_IP=$(get_public_ip)
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$TIMESTAMP] Service: $SERVICE_STATUS | Tasks: $RUNNING_TASKS/$DESIRED_TASKS | IP: $PUBLIC_IP"
    
    if [ "$RUNNING_TASKS" = "$DESIRED_TASKS" ] && [ "$RUNNING_TASKS" != "0" ]; then
        if [ "$PUBLIC_IP" != "" ] && [ "$PUBLIC_IP" != "None" ]; then
            echo "✅ Service is RUNNING!"
            echo ""
            test_health
            echo ""
            echo "🎉 YOUR APP IS LIVE!"
            echo "🌐 App URL: http://$PUBLIC_IP:8000"
            echo "🔍 Health Check: http://$PUBLIC_IP:8000/health/"
            echo "📊 ECS Console: https://console.aws.amazon.com/ecs/home?region=$REGION#/clusters/$CLUSTER_NAME/services"
            echo ""
            echo "💰 Monthly Cost: ~\$15-25"
            echo "📈 Auto-scaling: Available"
            echo "🔒 Load Balancer: Can be added"
            echo "⚖️ High Availability: Multi-AZ"
            break
        else
            echo "⏳ Waiting for public IP assignment..."
        fi
    else
        echo "🔄 Service is starting up..."
    fi
    
    sleep 15
done 