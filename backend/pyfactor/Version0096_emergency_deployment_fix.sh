#!/bin/bash
# Version 0096: Emergency Deployment Fix
# Creates a minimal, clean deployment to fix the failed environment state
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR" && pwd)"

echo "=== Version 0096: Emergency Deployment Fix ==="
echo "Backend directory: $BACKEND_DIR"

cd "$BACKEND_DIR"

# Create backup of current state
BACKUP_DIR="backup_emergency_$(date +%Y%m%d_%H%M%S)"
echo "Creating backup: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -r .ebextensions .platform Dockerfile Dockerrun.aws.json requirements*.txt "$BACKUP_DIR/" 2>/dev/null || true

# Remove all problematic configurations
echo "Cleaning problematic configurations..."
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
EOF

# Create minimal nginx configuration that works
mkdir -p .platform/nginx/conf.d
cat > .platform/nginx/conf.d/health.conf << 'EOF'
# Simple health check routing
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
EOF

# Create simple, working Dockerrun.aws.json
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
     "--timeout", "120"]
EOF

# Ensure minimal requirements-eb.txt exists
if [ ! -f "requirements-eb.txt" ]; then
    echo "Creating minimal requirements-eb.txt..."
    cat > requirements-eb.txt << 'EOF'
Django==5.1.7
gunicorn==21.2.0
psycopg2-binary==2.9.9
django-cors-headers==4.3.1
djangorestframework==3.15.1
python-decouple==3.8
requests==2.31.0
EOF
fi

# Create deployment package
echo "Creating emergency deployment package..."
PACKAGE_NAME="emergency-fix-$(date +%Y%m%d%H%M%S).zip"

# Include only essential files
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

# Check package size
PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)
echo "Package size: $PACKAGE_SIZE"

if [ -f "$PACKAGE_NAME" ]; then
    echo "✅ Emergency deployment package created: $PACKAGE_NAME"
    
    # Upload to S3
    echo "Uploading to S3..."
    aws s3 cp "$PACKAGE_NAME" s3://elasticbeanstalk-us-east-1-471112661935/ --region us-east-1
    
    # Create application version
    VERSION_LABEL="emergency-fix-$(date +%Y%m%d%H%M%S)"
    echo "Creating application version: $VERSION_LABEL"
    
    aws elasticbeanstalk create-application-version \
        --application-name "Dott" \
        --version-label "$VERSION_LABEL" \
        --source-bundle S3Bucket="elasticbeanstalk-us-east-1-471112661935",S3Key="$PACKAGE_NAME" \
        --region us-east-1
    
    # Deploy to environment
    echo "Deploying emergency fix to environment..."
    aws elasticbeanstalk update-environment \
        --environment-name "Dott-env-fixed" \
        --version-label "$VERSION_LABEL" \
        --region us-east-1
    
    echo ""
    echo "✅ Emergency deployment initiated!"
    echo "Version: $VERSION_LABEL"
    echo "Package: $PACKAGE_NAME"
    echo ""
    echo "This deployment includes:"
    echo "  ✅ Minimal .ebextensions (no conflicts)"
    echo "  ✅ Simple nginx health routing"
    echo "  ✅ Clean Dockerrun.aws.json"
    echo "  ✅ Optimized Dockerfile"
    echo "  ✅ Core dependencies only"
    echo ""
    echo "Monitor deployment with:"
    echo "aws elasticbeanstalk describe-events --environment-name Dott-env-fixed --region us-east-1"
    
    # Clean up
    rm -f "$PACKAGE_NAME"
    
else
    echo "❌ Failed to create deployment package"
    exit 1
fi

echo ""
echo "=== Emergency Fix Complete ===" 