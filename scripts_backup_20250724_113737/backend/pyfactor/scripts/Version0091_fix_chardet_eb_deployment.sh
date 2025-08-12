#!/bin/bash

# Version 0091: Fix Chardet EB Deployment Issue
# Created: $(date)
# Purpose: Fix chardet dependency conflict preventing EB deployment

set -e

echo "================================================="
echo " VERSION 0091: FIX CHARDET EB DEPLOYMENT ISSUE"
echo "================================================="

# Change to pyfactor directory
cd "$(dirname "$0")/.."
echo "Working directory: $(pwd)"

# Step 1: Create a clean requirements-eb.txt without chardet
echo "[Step 1] Creating clean requirements-eb.txt without chardet..."
cat > requirements-eb.txt << 'EOF'
# Core Django dependencies
Django==5.0.6
django-cors-headers==4.3.1
django-redis==5.4.0
psycopg2-binary==2.9.9

# API and Authentication
djangorestframework==3.15.1
PyJWT==2.8.0
boto3==1.34.101

# Celery and async processing
celery==5.4.0
redis==5.0.4

# Payment processing
stripe==9.5.0

# Utilities
python-decouple==3.8
python-dateutil==2.9.0.post0
openpyxl==3.1.2
Pillow==10.3.0
qrcode==7.4.2
pandas==2.2.2
reportlab==4.2.0
requests==2.31.0
urllib3==2.2.1
certifi==2024.2.2
idna==3.7

# Web server
gunicorn==22.0.0
EOF

echo "✅ Created clean requirements-eb.txt"

# Step 2: Create .ebextensions config to handle chardet
echo "[Step 2] Creating .ebextensions config to handle chardet..."
mkdir -p .ebextensions
cat > .ebextensions/00_fix_chardet.config << 'EOF'
commands:
  01_remove_chardet:
    command: |
      # Remove system chardet if it exists
      rpm -e --nodeps python3-chardet 2>/dev/null || true
      rpm -e --nodeps chardet 2>/dev/null || true
      # Clean pip cache
      pip cache purge
      # Remove any existing chardet installations
      pip uninstall -y chardet charset-normalizer 2>/dev/null || true
    ignoreErrors: true

option_settings:
  aws:elasticbeanstalk:application:environment:
    PYTHONPATH: "/var/app/current:$PYTHONPATH"
    DJANGO_SETTINGS_MODULE: "pyfactor.settings_eb"
  aws:elasticbeanstalk:container:python:
    WSGIPath: "pyfactor.wsgi:application"
EOF

echo "✅ Created .ebextensions/00_fix_chardet.config"

# Step 3: Create optimized Dockerfile
echo "[Step 3] Creating optimized Dockerfile..."
cat > Dockerfile << 'EOF'
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements-eb.txt /app/

# Install Python dependencies
# Explicitly exclude chardet and charset-normalizer
RUN pip install --no-cache-dir -r requirements-eb.txt && \
    pip uninstall -y chardet charset-normalizer 2>/dev/null || true

# Copy application code
COPY . /app/

# Create necessary directories
RUN mkdir -p /app/staticfiles /app/media /app/logs

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

# Expose port
EXPOSE 8000

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "pyfactor.wsgi:application"]
EOF

echo "✅ Created optimized Dockerfile"

# Step 4: Create .dockerignore
echo "[Step 4] Creating .dockerignore..."
cat > .dockerignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
.env
.venv/
venv/
ENV/
env/

# Django
*.log
*.pot
*.pyc
local_settings.py
db.sqlite3
media/
staticfiles/

# IDE
.idea/
.vscode/
*.swp
*.swo
*~
.DS_Store

# Project specific
node_modules/
frontend/
*.zip
*.tar.gz
lightweight_deployment_*/
max-security*/
temp*/
backups/
scripts/Version*.sh
scripts/Version*.mjs
scripts/Version*.js
EOF

echo "✅ Created .dockerignore"

# Step 5: Create Dockerrun.aws.json
echo "[Step 5] Creating Dockerrun.aws.json..."
cat > Dockerrun.aws.json << 'EOF'
{
  "AWSEBDockerrunVersion": "1",
  "Ports": [
    {
      "ContainerPort": 8000,
      "HostPort": 80
    }
  ],
  "Logging": "/var/log/nginx"
}
EOF

echo "✅ Created Dockerrun.aws.json"

# Step 6: Update .ebignore
echo "[Step 6] Updating .ebignore..."
cat > .ebignore << 'EOF'
# Virtual environments
.venv/
venv/
ENV/
env/

# Python cache
__pycache__/
*.pyc
*.pyo
*.pyd
.Python

# Django
*.log
db.sqlite3
media/
staticfiles/

# Development
.git/
.gitignore
.env
.env.*

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Project specific
node_modules/
frontend/
lightweight_deployment_*/
max-security*/
temp*/
backups/
*.zip
*.tar.gz
scripts/Version*.sh
scripts/Version*.mjs
scripts/Version*.js
EOF

echo "✅ Updated .ebignore"

# Step 7: Clean up old packages
echo "[Step 7] Cleaning up old packages..."
rm -f eb-deploy-*.zip
rm -rf lightweight_deployment_*
rm -rf max-security*
rm -rf temp*

echo "✅ Cleaned up old packages"

# Step 8: Create deployment package
echo "[Step 8] Creating deployment package..."
PACKAGE_NAME="eb-deploy-chardet-fix-$(date +%Y%m%d_%H%M%S).zip"

# Create the package excluding unnecessary files
zip -r "$PACKAGE_NAME" . \
  -x "*.git*" \
  -x "*__pycache__*" \
  -x "*.pyc" \
  -x "*venv/*" \
  -x "*.venv/*" \
  -x "*node_modules/*" \
  -x "*frontend/*" \
  -x "*lightweight_deployment_*/*" \
  -x "*max-security*/*" \
  -x "*temp*/*" \
  -x "*backups/*" \
  -x "*.zip" \
  -x "*.tar.gz" \
  -x "*scripts/Version*" \
  -x "*.DS_Store" \
  -q

PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)
echo "✅ Created deployment package: $PACKAGE_NAME ($PACKAGE_SIZE)"

# Step 9: Deploy to Elastic Beanstalk
echo "[Step 9] Deploying to Elastic Beanstalk..."
APP_NAME="Dott"
ENV_NAME="Dott-env-fixed"
VERSION_LABEL="Chardet-Fix-$(date +%Y%m%d-%H%M%S)"
REGION="us-east-1"

# Upload to S3
S3_BUCKET="elasticbeanstalk-${REGION}-058264255015"
S3_KEY="${APP_NAME}/${PACKAGE_NAME}"

echo "Uploading to S3..."
aws s3 cp "$PACKAGE_NAME" "s3://${S3_BUCKET}/${S3_KEY}" --region "$REGION"

# Create application version
echo "Creating application version..."
aws elasticbeanstalk create-application-version \
  --application-name "$APP_NAME" \
  --version-label "$VERSION_LABEL" \
  --source-bundle "S3Bucket=${S3_BUCKET},S3Key=${S3_KEY}" \
  --description "Fixed chardet dependency conflict" \
  --region "$REGION"

# Deploy the version
echo "Deploying version to environment..."
aws elasticbeanstalk update-environment \
  --application-name "$APP_NAME" \
  --environment-name "$ENV_NAME" \
  --version-label "$VERSION_LABEL" \
  --region "$REGION"

echo ""
echo "================================================="
echo " DEPLOYMENT INITIATED SUCCESSFULLY! ✅"
echo "================================================="
echo ""
echo "Package: $PACKAGE_NAME ($PACKAGE_SIZE)"
echo "Version: $VERSION_LABEL"
echo "Environment: $ENV_NAME"
echo ""
echo "Key fixes applied:"
echo "  ✅ Removed chardet from requirements"
echo "  ✅ Added .ebextensions to handle system chardet"
echo "  ✅ Optimized Docker build process"
echo "  ✅ Excluded unnecessary files"
echo ""
echo "Monitor deployment at:"
echo "  https://console.aws.amazon.com/elasticbeanstalk/home?region=${REGION}#/environment/dashboard?environmentName=${ENV_NAME}"
echo ""
echo "Health check URL:"
echo "  https://${ENV_NAME}.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/"
echo ""