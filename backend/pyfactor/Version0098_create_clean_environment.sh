#!/bin/bash
# Version 0098: Create Clean Environment
# Creates a fresh, clean environment with minimal configuration
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR" && pwd)"

echo "=== Version 0098: Create Clean Environment ==="
echo "Backend directory: $BACKEND_DIR"

cd "$BACKEND_DIR"

# Configuration
REGION="us-east-1"
APPLICATION_NAME="Dott"
ENVIRONMENT_NAME="Dott-env-clean"
PLATFORM_ARN="arn:aws:elasticbeanstalk:us-east-1::platform/Docker running on 64bit Amazon Linux 2023/4.5.2"
INSTANCE_TYPE="t3.small"

# Create the deployment package
PACKAGE_NAME="clean-deploy-$(date +%Y%m%d%H%M%S).zip"
echo "📦 Creating clean deployment package: $PACKAGE_NAME"

# Clean up any existing configurations
rm -rf .ebextensions/*
rm -rf .platform/*

# Create minimal .ebextensions
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

# Create working nginx configuration
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

# Create optimized Dockerrun.aws.json
cat > Dockerrun.aws.json << 'EOF'
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "python:3.12-slim",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": "8000"
    }
  ],
  "Volumes": [],
  "Logging": "/var/log/eb-docker"
}
EOF

# Create minimal Dockerfile
cat > Dockerfile << 'EOF'
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install requirements
COPY requirements-eb.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-eb.txt

# Copy application
COPY . .

# Create directories
RUN mkdir -p staticfiles logs

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/health/ || exit 1

# Run application
CMD ["gunicorn", "pyfactor.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "2", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
EOF

# Ensure minimal requirements
cat > requirements-eb.txt << 'EOF'
Django==5.1.7
gunicorn==21.2.0
psycopg2-binary==2.9.9
django-cors-headers==4.3.1
djangorestframework==3.15.1
python-decouple==3.8
requests==2.31.0
urllib3==2.2.1
EOF

# Create deployment package
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
VERSION_LABEL="clean-deploy-$(date +%Y%m%d%H%M%S)"
echo "📝 Creating application version: $VERSION_LABEL"

aws elasticbeanstalk create-application-version \
    --application-name "$APPLICATION_NAME" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="elasticbeanstalk-us-east-1-471112661935",S3Key="$PACKAGE_NAME" \
    --region "$REGION"

# Create new environment with all settings
echo "🚀 Creating new environment: $ENVIRONMENT_NAME"

# Create environment configuration
cat > environment-config.json << EOF
{
  "ApplicationName": "$APPLICATION_NAME",
  "EnvironmentName": "$ENVIRONMENT_NAME",
  "VersionLabel": "$VERSION_LABEL",
  "PlatformArn": "$PLATFORM_ARN",
  "Tier": {
    "Name": "WebServer",
    "Type": "Standard"
  },
  "OptionSettings": [
    {
      "Namespace": "aws:ec2:instances",
      "OptionName": "InstanceTypes",
      "Value": "$INSTANCE_TYPE"
    },
    {
      "Namespace": "aws:elasticbeanstalk:application:environment",
      "OptionName": "DJANGO_SETTINGS_MODULE",
      "Value": "pyfactor.settings_eb"
    },
    {
      "Namespace": "aws:elasticbeanstalk:application:environment",
      "OptionName": "PYTHONUNBUFFERED",
      "Value": "1"
    },
    {
      "Namespace": "aws:elasticbeanstalk:environment:proxy",
      "OptionName": "ProxyServer",
      "Value": "nginx"
    }
  ]
}
EOF

# Create the environment
aws elasticbeanstalk create-environment \
    --cli-input-json file://environment-config.json \
    --region "$REGION"

echo "⏳ Waiting for environment to launch..."
echo "This may take 5-10 minutes..."

# Wait for environment to be ready
aws elasticbeanstalk wait environment-exists \
    --environment-names "$ENVIRONMENT_NAME" \
    --region "$REGION"

# Monitor the environment status
COUNTER=0
MAX_ATTEMPTS=60
while [ $COUNTER -lt $MAX_ATTEMPTS ]; do
    STATUS=$(aws elasticbeanstalk describe-environments \
        --environment-names "$ENVIRONMENT_NAME" \
        --region "$REGION" \
        --query 'Environments[0].Status' \
        --output text)
    
    HEALTH=$(aws elasticbeanstalk describe-environments \
        --environment-names "$ENVIRONMENT_NAME" \
        --region "$REGION" \
        --query 'Environments[0].Health' \
        --output text)
    
    echo "Status: $STATUS | Health: $HEALTH"
    
    if [ "$STATUS" = "Ready" ] && [ "$HEALTH" = "Green" ]; then
        echo "✅ Environment is ready and healthy!"
        break
    elif [ "$STATUS" = "Ready" ]; then
        echo "Environment is ready but health is $HEALTH"
        break
    fi
    
    sleep 10
    COUNTER=$((COUNTER + 1))
done

# Get environment details
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
HEALTH_RESPONSE=$(curl -s --max-time 10 "http://$ENVIRONMENT_URL/health/" || echo "TIMEOUT")
echo "Health check response: $HEALTH_RESPONSE"

# Clean up
rm -f "$PACKAGE_NAME" environment-config.json

echo ""
echo "=== Clean Environment Creation Complete ==="
echo "Environment: $ENVIRONMENT_NAME"
echo "URL: http://$ENVIRONMENT_URL"
echo ""
echo "Next steps:"
echo "1. Monitor the environment in the AWS console"
echo "2. Check CloudWatch logs if there are any issues"
echo "3. Once stable, update DNS/routing to point to the new environment" 