#!/bin/bash
# Version 0097: Recreate Environment
# Terminates the failed environment and creates a fresh one
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR" && pwd)"

echo "=== Version 0097: Recreate Environment ==="
echo "Backend directory: $BACKEND_DIR"

cd "$BACKEND_DIR"

# Configuration
REGION="us-east-1"
APPLICATION_NAME="Dott"
OLD_ENVIRONMENT_NAME="Dott-env-fixed"
NEW_ENVIRONMENT_NAME="Dott-env-clean"
PLATFORM_ARN="arn:aws:elasticbeanstalk:us-east-1::platform/Docker running on 64bit Amazon Linux 2023/4.5.2"

echo "🔍 Checking current environment status..."
CURRENT_STATUS=$(aws elasticbeanstalk describe-environments \
    --environment-names "$OLD_ENVIRONMENT_NAME" \
    --region "$REGION" \
    --query 'Environments[0].Status' \
    --output text 2>/dev/null || echo "NotFound")

echo "Current environment status: $CURRENT_STATUS"

if [ "$CURRENT_STATUS" != "NotFound" ]; then
    echo "🗑️ Terminating failed environment: $OLD_ENVIRONMENT_NAME"
    aws elasticbeanstalk terminate-environment \
        --environment-name "$OLD_ENVIRONMENT_NAME" \
        --region "$REGION"
    
    echo "⏳ Waiting for environment termination..."
    aws elasticbeanstalk wait environment-terminated \
        --environment-names "$OLD_ENVIRONMENT_NAME" \
        --region "$REGION"
    
    echo "✅ Environment terminated successfully"
else
    echo "ℹ️ Environment not found, proceeding to create new one"
fi

# Create the emergency deployment package if it doesn't exist
PACKAGE_NAME="emergency-fix-$(date +%Y%m%d%H%M%S).zip"
echo "📦 Creating fresh deployment package: $PACKAGE_NAME"

# Ensure we have clean configurations
rm -rf .ebextensions/*
rm -rf .platform/*

# Create minimal, working .ebextensions
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
EOF

# Create minimal nginx configuration
mkdir -p .platform/nginx/conf.d
cat > .platform/nginx/conf.d/health.conf << 'EOF'
# Health check routing for ALB
location /health/ {
    proxy_pass http://docker:8000/health/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_send_timeout 10s;
    proxy_read_timeout 10s;
}

# Root path routing
location / {
    proxy_pass http://docker:8000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}
EOF

# Create clean Dockerrun.aws.json
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
  "Volumes": [
    {
      "HostDirectory": "/var/app/current",
      "ContainerDirectory": "/app"
    }
  ],
  "Logging": "/var/log/eb-docker"
}
EOF

# Create optimized Dockerfile
cat > Dockerfile << 'EOF'
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements-eb.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-eb.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p staticfiles logs

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/health/ || exit 1

# Run gunicorn
CMD ["gunicorn", "pyfactor.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "2", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
EOF

# Ensure minimal requirements-eb.txt
cat > requirements-eb.txt << 'EOF'
Django==5.1.7
gunicorn==21.2.0
psycopg2-binary==2.9.9
django-cors-headers==4.3.1
djangorestframework==3.15.1
python-decouple==3.8
requests==2.31.0
EOF

# Create deployment package
echo "📦 Creating deployment package..."
zip -r "$PACKAGE_NAME" \
    .ebextensions/ \
    .platform/ \
    Dockerfile \
    Dockerrun.aws.json \
    requirements-eb.txt \
    pyfactor/ \
    users/ \
    manage.py \
    -x "*.pyc" "*/__pycache__/*" "*.log" "*.tmp" ".git/*" ".venv/*" "venv/*" \
    > /dev/null

PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)
echo "Package size: $PACKAGE_SIZE"

# Upload to S3
echo "⬆️ Uploading to S3..."
aws s3 cp "$PACKAGE_NAME" s3://elasticbeanstalk-us-east-1-471112661935/ --region "$REGION"

# Create application version
VERSION_LABEL="clean-env-$(date +%Y%m%d%H%M%S)"
echo "📝 Creating application version: $VERSION_LABEL"

aws elasticbeanstalk create-application-version \
    --application-name "$APPLICATION_NAME" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="elasticbeanstalk-us-east-1-471112661935",S3Key="$PACKAGE_NAME" \
    --region "$REGION"

# Create new environment
echo "🚀 Creating new environment: $NEW_ENVIRONMENT_NAME"
aws elasticbeanstalk create-environment \
    --application-name "$APPLICATION_NAME" \
    --environment-name "$NEW_ENVIRONMENT_NAME" \
    --version-label "$VERSION_LABEL" \
    --platform-arn "$PLATFORM_ARN" \
    --region "$REGION"

echo "⏳ Waiting for environment to be ready..."
aws elasticbeanstalk wait environment-updated \
    --environment-names "$NEW_ENVIRONMENT_NAME" \
    --region "$REGION"

# Get environment URL
ENVIRONMENT_URL=$(aws elasticbeanstalk describe-environments \
    --environment-names "$NEW_ENVIRONMENT_NAME" \
    --region "$REGION" \
    --query 'Environments[0].CNAME' \
    --output text)

echo ""
echo "✅ New environment created successfully!"
echo "Environment: $NEW_ENVIRONMENT_NAME"
echo "URL: $ENVIRONMENT_URL"
echo "Version: $VERSION_LABEL"
echo ""
echo "🧪 Testing health endpoint..."
sleep 30
HEALTH_RESPONSE=$(curl -s --max-time 10 "http://$ENVIRONMENT_URL/health/" || echo "TIMEOUT")
echo "Health check response: $HEALTH_RESPONSE"

# Clean up
rm -f "$PACKAGE_NAME"

echo ""
echo "=== Environment Recreation Complete ==="
echo "Old environment: $OLD_ENVIRONMENT_NAME (terminated)"
echo "New environment: $NEW_ENVIRONMENT_NAME (ready)"
echo "URL: http://$ENVIRONMENT_URL" 