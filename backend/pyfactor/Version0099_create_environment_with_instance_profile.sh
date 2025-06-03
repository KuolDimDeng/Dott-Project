#!/bin/bash
# Version 0099: Create Environment with Instance Profile
# Creates a new environment with all necessary configurations including instance profile
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR" && pwd)"

echo "=== Version 0099: Create Environment with Instance Profile ==="
echo "Backend directory: $BACKEND_DIR"

cd "$BACKEND_DIR"

# Configuration
REGION="us-east-1"
APPLICATION_NAME="Dott"
ENVIRONMENT_NAME="Dott-env-v099"
PLATFORM_ARN="arn:aws:elasticbeanstalk:us-east-1::platform/Docker running on 64bit Amazon Linux 2023/4.5.2"
INSTANCE_TYPE="t3.small"
INSTANCE_PROFILE="aws-elasticbeanstalk-ec2-role"

echo "📋 Using existing application version: clean-deploy-20250529130718"
VERSION_LABEL="clean-deploy-20250529130718"

# Create new environment with proper instance profile
echo "🚀 Creating new environment: $ENVIRONMENT_NAME"

# Create environment with all necessary options
aws elasticbeanstalk create-environment \
    --application-name "$APPLICATION_NAME" \
    --environment-name "$ENVIRONMENT_NAME" \
    --version-label "$VERSION_LABEL" \
    --platform-arn "$PLATFORM_ARN" \
    --region "$REGION" \
    --option-settings \
        Namespace=aws:autoscaling:launchconfiguration,OptionName=IamInstanceProfile,Value=$INSTANCE_PROFILE \
        Namespace=aws:ec2:instances,OptionName=InstanceTypes,Value=$INSTANCE_TYPE \
        Namespace=aws:elasticbeanstalk:application:environment,OptionName=DJANGO_SETTINGS_MODULE,Value=pyfactor.settings_eb \
        Namespace=aws:elasticbeanstalk:application:environment,OptionName=PYTHONUNBUFFERED,Value=1 \
        Namespace=aws:elasticbeanstalk:environment:proxy,OptionName=ProxyServer,Value=nginx \
        Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=HealthCheckPath,Value=/health/ \
        Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=HealthCheckInterval,Value=15 \
        Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=HealthCheckTimeout,Value=5 \
        Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=HealthyThresholdCount,Value=2 \
        Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=UnhealthyThresholdCount,Value=3 \
        Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=Port,Value=80 \
        Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=Protocol,Value=HTTP \
        Namespace=aws:elasticbeanstalk:healthreporting:system,OptionName=SystemType,Value=enhanced

echo "⏳ Environment creation initiated. Monitoring status..."

# Monitor the environment creation
COUNTER=0
MAX_ATTEMPTS=60
while [ $COUNTER -lt $MAX_ATTEMPTS ]; do
    sleep 10
    
    ENV_STATUS=$(aws elasticbeanstalk describe-environments \
        --environment-names "$ENVIRONMENT_NAME" \
        --region "$REGION" \
        --query 'Environments[0].Status' \
        --output text 2>/dev/null || echo "NotFound")
    
    if [ "$ENV_STATUS" = "NotFound" ]; then
        echo "Waiting for environment to be created..."
    else
        HEALTH=$(aws elasticbeanstalk describe-environments \
            --environment-names "$ENVIRONMENT_NAME" \
            --region "$REGION" \
            --query 'Environments[0].Health' \
            --output text)
        
        echo "Status: $ENV_STATUS | Health: $HEALTH"
        
        if [ "$ENV_STATUS" = "Ready" ]; then
            echo "✅ Environment is ready!"
            break
        elif [ "$ENV_STATUS" = "Terminated" ] || [ "$ENV_STATUS" = "Terminating" ]; then
            echo "❌ Environment failed to launch"
            
            # Get recent events to understand the failure
            echo "Recent events:"
            aws elasticbeanstalk describe-events \
                --environment-name "$ENVIRONMENT_NAME" \
                --region "$REGION" \
                --max-items 5 \
                --query 'Events[*].Message' \
                --output table
            exit 1
        fi
    fi
    
    COUNTER=$((COUNTER + 1))
done

# Get environment details
if [ "$ENV_STATUS" = "Ready" ]; then
    ENVIRONMENT_URL=$(aws elasticbeanstalk describe-environments \
        --environment-names "$ENVIRONMENT_NAME" \
        --region "$REGION" \
        --query 'Environments[0].CNAME' \
        --output text)
    
    echo ""
    echo "✅ Environment created successfully!"
    echo "Environment: $ENVIRONMENT_NAME"
    echo "URL: http://$ENVIRONMENT_URL"
    echo "Version: $VERSION_LABEL"
    echo ""
    
    # Test the health endpoint
    echo "🧪 Testing health endpoint..."
    sleep 30
    
    for i in {1..3}; do
        echo "Attempt $i:"
        HEALTH_RESPONSE=$(curl -s --max-time 10 "http://$ENVIRONMENT_URL/health/" || echo "TIMEOUT")
        echo "Response: $HEALTH_RESPONSE"
        
        if [[ "$HEALTH_RESPONSE" != "TIMEOUT" ]] && [[ -n "$HEALTH_RESPONSE" ]]; then
            echo "✅ Health check successful!"
            break
        fi
        
        if [ $i -lt 3 ]; then
            echo "Retrying in 10 seconds..."
            sleep 10
        fi
    done
    
    echo ""
    echo "=== Environment Creation Complete ==="
    echo "Environment: $ENVIRONMENT_NAME"
    echo "URL: http://$ENVIRONMENT_URL"
    echo ""
    echo "Next steps:"
    echo "1. Monitor the environment health in AWS console"
    echo "2. Check CloudWatch logs if any issues persist"
    echo "3. If stable, you can terminate old environments"
else
    echo "❌ Environment creation timed out or failed"
    echo "Check AWS console for more details"
fi 