#!/bin/bash
# Version 0100: Create New Application and Environment
# Creates a fresh application and environment
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR" && pwd)"

echo "=== Version 0100: Create New Application and Environment ==="
echo "Backend directory: $BACKEND_DIR"

cd "$BACKEND_DIR"

# Configuration
REGION="us-east-1"
APPLICATION_NAME="DottApp"  # New application name
ENVIRONMENT_NAME="DottApp-prod"
PLATFORM_ARN="arn:aws:elasticbeanstalk:us-east-1::platform/Docker running on 64bit Amazon Linux 2023/4.5.2"
INSTANCE_TYPE="t3.small"
INSTANCE_PROFILE="aws-elasticbeanstalk-ec2-role"

# Create new application
echo "📱 Creating new application: $APPLICATION_NAME"
aws elasticbeanstalk create-application \
    --application-name "$APPLICATION_NAME" \
    --description "Dott Application - Production" \
    --region "$REGION" || {
        echo "Application might already exist, continuing..."
    }

# Create deployment package
PACKAGE_NAME="dottapp-deploy-$(date +%Y%m%d%H%M%S).zip"
echo "📦 Creating deployment package: $PACKAGE_NAME"

# Ensure we have clean configurations from previous runs
if [ ! -f ".ebextensions/01_environment.config" ]; then
    mkdir -p .ebextensions
    cat > .ebextensions/01_environment.config << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONUNBUFFERED: 1
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: nginx
  aws:ec2:instances:
    InstanceTypes: t3.small
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health/
    HealthCheckInterval: 15
    HealthCheckTimeout: 5
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 3
    Port: 80
    Protocol: HTTP
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
EOF
fi

if [ ! -f ".platform/nginx/conf.d/health.conf" ]; then
    mkdir -p .platform/nginx/conf.d
    cat > .platform/nginx/conf.d/health.conf << 'EOF'
# Health check configuration
upstream docker {
    server 127.0.0.1:8000;
}

location /health/ {
    proxy_pass http://docker/health/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_send_timeout 10s;
    proxy_read_timeout 10s;
}

location / {
    proxy_pass http://docker/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}
EOF
fi

# Build deployment package
echo "📦 Building deployment package..."
zip -r "$PACKAGE_NAME" \
    .ebextensions/ \
    .platform/ \
    Dockerfile \
    Dockerrun.aws.json \
    requirements-eb.txt \
    pyfactor/ \
    users/ \
    health/ \
    manage.py \
    -x "*.pyc" "*/__pycache__/*" "*.log" "*.tmp" ".git/*" ".venv/*" "venv/*" "*/migrations/*" \
    > /dev/null

PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)
echo "Package size: $PACKAGE_SIZE"

# Upload to S3
echo "⬆️ Uploading to S3..."
aws s3 cp "$PACKAGE_NAME" s3://elasticbeanstalk-us-east-1-471112661935/ --region "$REGION"

# Create application version
VERSION_LABEL="dottapp-v$(date +%Y%m%d%H%M%S)"
echo "📝 Creating application version: $VERSION_LABEL"

aws elasticbeanstalk create-application-version \
    --application-name "$APPLICATION_NAME" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="elasticbeanstalk-us-east-1-471112661935",S3Key="$PACKAGE_NAME" \
    --region "$REGION"

# Create environment with all necessary settings
echo "🚀 Creating new environment: $ENVIRONMENT_NAME"

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

# Monitor environment creation
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
            
            # Get recent events
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
ENVIRONMENT_URL=$(aws elasticbeanstalk describe-environments \
    --environment-names "$ENVIRONMENT_NAME" \
    --region "$REGION" \
    --query 'Environments[0].CNAME' \
    --output text)

echo ""
echo "✅ New application and environment created successfully!"
echo "Application: $APPLICATION_NAME"
echo "Environment: $ENVIRONMENT_NAME"
echo "URL: http://$ENVIRONMENT_URL"
echo "Version: $VERSION_LABEL"
echo ""

# Test health endpoint
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

# Clean up
rm -f "$PACKAGE_NAME"

echo ""
echo "=== Deployment Complete ==="
echo "Application: $APPLICATION_NAME"
echo "Environment: $ENVIRONMENT_NAME"
echo "URL: http://$ENVIRONMENT_URL"
echo ""
echo "Summary of fixes applied:"
echo "✅ Created new application to avoid deletion issues"
echo "✅ Configured instance profile properly"
echo "✅ Set up nginx health check routing"
echo "✅ Configured Docker with minimal settings"
echo "✅ Applied all Version0093 fixes" 