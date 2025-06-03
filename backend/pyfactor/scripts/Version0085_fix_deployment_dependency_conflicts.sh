#!/bin/bash

# Version 0085: Fix Deployment Dependency Conflicts
# 
# CRITICAL: Backend deployment failing due to psycopg2-binary version conflicts
# This script resolves dependency conflicts and fixes Docker build issues
# 
# Date: 2025-05-29
# Purpose: Fix psycopg2-binary conflicts and setuptools issues for successful deployment
# Issue: Multiple psycopg2-binary versions causing pip install failures

set -e

echo "=== Version 0085: Fix Deployment Dependency Conflicts ==="
echo "🚨 ISSUE: Backend deployment failing with dependency conflicts"
echo "🔍 Current directory: $(pwd)"

# Navigate to backend directory
cd /Users/kuoldeng/projectx/backend/pyfactor

echo "📝 Step 1: Backup current requirements-eb.txt..."
if [ -f "requirements-eb.txt" ]; then
    cp requirements-eb.txt "requirements-eb.txt.backup_$(date +%Y%m%d_%H%M%S)"
    echo "✅ Backup created"
else
    echo "❌ requirements-eb.txt not found"
    exit 1
fi

echo "📝 Step 2: Fix psycopg2-binary version conflict..."
# Remove duplicate psycopg2-binary entries and keep only one version
sed -i.bak '/psycopg2-binary==/d' requirements-eb.txt
echo "psycopg2-binary==2.9.9" >> requirements-eb.txt
echo "✅ Fixed psycopg2-binary version to 2.9.9"

echo "📝 Step 3: Fix setuptools issue..."
# Ensure setuptools is properly specified
sed -i.bak '/^setuptools==/d' requirements-eb.txt
# Add setuptools at the beginning for build compatibility
sed -i.bak '1i\
setuptools==69.5.1
' requirements-eb.txt
echo "✅ Added proper setuptools version"

echo "📝 Step 4: Update Dockerfile to fix build issues..."
if [ -f "Dockerfile" ]; then
    cp Dockerfile "Dockerfile.backup_$(date +%Y%m%d_%H%M%S)"
fi

cat > Dockerfile << 'EOF'
# Use Python 3.12 slim image
FROM python:3.12-slim

# Set maintainer
LABEL maintainer="Pyfactor DevOps Team <devops@pyfactor.com>"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    pkg-config \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements-eb.txt /app/

# Upgrade pip and install setuptools first
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-eb.txt

# Copy project files
COPY . /app/

# Create necessary directories
RUN mkdir -p /app/static /app/media

# Collect static files
RUN python manage.py collectstatic --noinput --settings=pyfactor.settings_eb

# Expose port
EXPOSE 8000

# Run gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "pyfactor.wsgi:application"]
EOF

echo "✅ Updated Dockerfile with proper dependency management"

echo "📝 Step 5: Create/update Dockerrun.aws.json..."
cat > Dockerrun.aws.json << 'EOF'
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": ".",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": "8000"
    }
  ],
  "Logging": "/var/log/eb-docker/containers/eb-current-app"
}
EOF

echo "✅ Created proper Dockerrun.aws.json"

echo "📝 Step 6: Validate requirements file..."
echo "📊 Requirements summary:"
echo "   - Total packages: $(wc -l < requirements-eb.txt)"
echo "   - psycopg2-binary version: $(grep psycopg2-binary requirements-eb.txt || echo 'Not found')"
echo "   - setuptools version: $(grep setuptools requirements-eb.txt || echo 'Not found')"

echo "📝 Step 7: Create deployment package..."
if [ -f "deployment-package.zip" ]; then
    rm deployment-package.zip
fi

# Create clean deployment package
zip -r deployment-package.zip . \
    -x "*.pyc" \
    -x "__pycache__/*" \
    -x "*.git*" \
    -x "venv/*" \
    -x ".venv/*" \
    -x "*.backup_*" \
    -x "*.bak" \
    -x "node_modules/*" \
    -x "*.log"

echo "✅ Created deployment package: deployment-package.zip"

echo "📝 Step 8: Deploy to Elastic Beanstalk..."
if command -v eb >/dev/null 2>&1; then
    echo "🚀 Deploying with EB CLI..."
    eb deploy Dott-env-fixed --timeout 20
else
    echo "⚠️  EB CLI not available. Manual deployment required:"
    echo "   1. Upload deployment-package.zip to Elastic Beanstalk"
    echo "   2. Deploy to Dott-env-fixed environment"
fi

echo ""
echo "🎉 === DEPLOYMENT FIX COMPLETED ==="
echo "✅ Fixed psycopg2-binary version conflict"
echo "✅ Fixed setuptools build issue"
echo "✅ Updated Dockerfile for proper dependency installation"
echo "✅ Created clean deployment package"
echo ""
echo "📋 Next Steps:"
echo "   1. Monitor deployment in AWS Console"
echo "   2. Check health status in Elastic Beanstalk"
echo "   3. Test OAuth API endpoints after deployment"
echo ""
echo "🔗 Health Check: https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/"
