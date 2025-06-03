#!/bin/bash

# Version 0093: Fix Missing Dependencies (python-decouple)
# Created: $(date)
# Purpose: Fix ModuleNotFoundError for dotenv by ensuring all dependencies are included

set -e

echo "================================================="
echo " VERSION 0093: FIX MISSING DEPENDENCIES"
echo "================================================="

# Change to pyfactor directory
cd "$(dirname "$0")/.."
echo "Working directory: $(pwd)"

# Step 1: Create complete requirements.txt with ALL dependencies
echo "[Step 1] Creating complete requirements.txt with python-decouple..."
cat > requirements.txt << 'EOF'
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

# Environment and configuration
python-decouple==3.8

# Utilities
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

echo "✅ Created complete requirements.txt with python-decouple"

# Step 2: Create optimized Dockerfile
echo "[Step 2] Creating optimized Dockerfile..."
cat > Dockerfile << 'EOF'
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt /app/

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app/

# Create necessary directories
RUN mkdir -p /app/staticfiles /app/media /app/logs

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb
ENV PORT=8000

# Expose port
EXPOSE 8000

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "--log-level", "info", "pyfactor.wsgi:application"]
EOF

echo "✅ Created optimized Dockerfile"

# Step 3: Create .dockerignore
echo "[Step 3] Creating .dockerignore..."
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
scripts/
.git/
.gitignore
EOF

echo "✅ Created .dockerignore"

# Step 4: Create simple Dockerrun.aws.json
echo "[Step 4] Creating Dockerrun.aws.json..."
cat > Dockerrun.aws.json << 'EOF'
{
  "AWSEBDockerrunVersion": "1",
  "Ports": [
    {
      "ContainerPort": 8000
    }
  ]
}
EOF

echo "✅ Created Dockerrun.aws.json"

# Step 5: Create health check view if missing
echo "[Step 5] Ensuring health check view exists..."
mkdir -p health
cat > health/__init__.py << 'EOF'
EOF

cat > health/views.py << 'EOF'
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "healthy", "service": "pyfactor-backend"})
EOF

cat > health/urls.py << 'EOF'
from django.urls import path
from . import views

urlpatterns = [
    path('', views.health_check, name='health_check'),
]
EOF

echo "✅ Created health check app"

# Step 6: Clean up old packages
echo "[Step 6] Cleaning up old packages..."
rm -f eb-deploy-*.zip
rm -rf lightweight_deployment_*
rm -rf max-security*
rm -rf temp*

echo "✅ Cleaned up old packages"

# Step 7: Create deployment package
echo "[Step 7] Creating deployment package..."
PACKAGE_NAME="eb-deploy-dependencies-fixed-$(date +%Y%m%d_%H%M%S).zip"

# Create the package with only essential files
zip -r "$PACKAGE_NAME" \
  *.py \
  pyfactor/ \
  custom_auth/ \
  users/ \
  hr/ \
  finance/ \
  onboarding/ \
  payroll/ \
  reports/ \
  health/ \
  templates/ \
  requirements.txt \
  Dockerfile \
  Dockerrun.aws.json \
  -x "*.pyc" \
  -x "*__pycache__*" \
  -x "*.DS_Store" \
  -x "*.git*" \
  -x "*.venv*" \
  -x "*scripts/*" \
  -q

PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)
echo "✅ Created deployment package: $PACKAGE_NAME ($PACKAGE_SIZE)"

# Step 8: Deploy to Elastic Beanstalk
echo "[Step 8] Deploying to Elastic Beanstalk..."
APP_NAME="Dott"
ENV_NAME="Dott-env-fixed"
VERSION_LABEL="Dependencies-Fixed-$(date +%Y%m%d-%H%M%S)"
REGION="us-east-1"

# Upload to S3
S3_BUCKET="elasticbeanstalk-us-east-1-471112661935"
S3_KEY="${APP_NAME}/${PACKAGE_NAME}"

echo "Uploading to S3..."
aws s3 cp "$PACKAGE_NAME" "s3://${S3_BUCKET}/${S3_KEY}" --region "$REGION"

# Create application version
echo "Creating application version..."
aws elasticbeanstalk create-application-version \
  --application-name "$APP_NAME" \
  --version-label "$VERSION_LABEL" \
  --source-bundle "S3Bucket=${S3_BUCKET},S3Key=${S3_KEY}" \
  --description "Fixed missing python-decouple dependency" \
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
echo "  ✅ Added python-decouple to requirements.txt"
echo "  ✅ Added build-essential for compilation dependencies"
echo "  ✅ Enhanced Dockerfile with better logging"
echo "  ✅ Created health check endpoint"
echo ""
echo "Monitor deployment at:"
echo "  https://console.aws.amazon.com/elasticbeanstalk/home?region=${REGION}#/environment/dashboard?environmentName=${ENV_NAME}"
echo ""
echo "Health check URL:"
echo "  https://${ENV_NAME}.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/"
echo ""