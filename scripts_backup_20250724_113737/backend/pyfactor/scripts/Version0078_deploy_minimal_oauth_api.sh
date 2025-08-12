#!/bin/bash

# OAuth API Minimal Deployment for Elastic Beanstalk (<500MB)
# Version 0078 - Creates minimal package with only OAuth API changes
# Date: $(date '+%Y-%m-%d %H:%M:%S')

set -e

echo "==== MINIMAL OAUTH API DEPLOYMENT FOR ELASTIC BEANSTALK ===="
echo "This script creates a minimal package with only OAuth API changes"
echo "Target Environment: Dott-env-fixed"
echo "Target Domain: Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

echo "✓ AWS CLI found at: $(which aws)"
echo "Using AWS CLI: $(aws --version)"

# Create temporary directory for minimal package
TEMP_DIR=$(mktemp -d)
echo "Using temporary directory: $TEMP_DIR"

echo "Creating minimal Django package..."

# Core files needed for minimal deployment
echo "Copying essential core files..."
cp manage.py "$TEMP_DIR/"
cp requirements-eb.txt "$TEMP_DIR/requirements.txt"

# Main Django app
echo "Copying Django settings..."
mkdir -p "$TEMP_DIR/pyfactor"
cp -r pyfactor/__init__.py "$TEMP_DIR/pyfactor/"
cp -r pyfactor/settings.py "$TEMP_DIR/pyfactor/"
cp -r pyfactor/settings_eb.py "$TEMP_DIR/pyfactor/"
cp -r pyfactor/urls.py "$TEMP_DIR/pyfactor/"
cp -r pyfactor/wsgi.py "$TEMP_DIR/pyfactor/"

# Health check app (minimal)
echo "Copying health check..."
mkdir -p "$TEMP_DIR/health"
cp -r health/__init__.py "$TEMP_DIR/health/"
cp -r health/views.py "$TEMP_DIR/health/"
cp -r health/urls.py "$TEMP_DIR/health/"

# Custom auth app with OAuth API
echo "Copying custom auth with OAuth API..."
mkdir -p "$TEMP_DIR/custom_auth"
cp -r custom_auth/__init__.py "$TEMP_DIR/custom_auth/"
cp -r custom_auth/models.py "$TEMP_DIR/custom_auth/"
cp -r custom_auth/authentication.py "$TEMP_DIR/custom_auth/"
cp -r custom_auth/jwt.py "$TEMP_DIR/custom_auth/"
cp -r custom_auth/connection_limiter.py "$TEMP_DIR/custom_auth/"

# OAuth API views and URLs (the main feature)
mkdir -p "$TEMP_DIR/custom_auth/api"
mkdir -p "$TEMP_DIR/custom_auth/api/views"
cp -r custom_auth/api/__init__.py "$TEMP_DIR/custom_auth/api/"
cp -r custom_auth/api/urls.py "$TEMP_DIR/custom_auth/api/"
cp -r custom_auth/api/views/__init__.py "$TEMP_DIR/custom_auth/api/views/"
cp -r custom_auth/api/views/auth_views.py "$TEMP_DIR/custom_auth/api/views/"
cp -r custom_auth/api/views/tenant_views.py "$TEMP_DIR/custom_auth/api/views/"

# Users app (minimal)
echo "Copying users app..."
mkdir -p "$TEMP_DIR/users"
cp -r users/__init__.py "$TEMP_DIR/users/"
cp -r users/models.py "$TEMP_DIR/users/"

# Onboarding app (minimal)
echo "Copying onboarding app..."
mkdir -p "$TEMP_DIR/onboarding"
cp -r onboarding/__init__.py "$TEMP_DIR/onboarding/"
cp -r onboarding/models.py "$TEMP_DIR/onboarding/"
cp -r onboarding/utils.py "$TEMP_DIR/onboarding/"

# Add other essential apps
for app in "crm" "hr" "sales"; do
    if [ -d "$app" ]; then
        echo "Copying $app app..."
        mkdir -p "$TEMP_DIR/$app"
        cp -r "$app/__init__.py" "$TEMP_DIR/$app/" 2>/dev/null || true
        cp -r "$app/models.py" "$TEMP_DIR/$app/" 2>/dev/null || true
    fi
done

# Add minimal static files if they exist
if [ -d "static" ]; then
    echo "Copying minimal static files..."
    mkdir -p "$TEMP_DIR/static"
    # Only copy essential static files, not large images or media
    find static -name "*.css" -o -name "*.js" | head -20 | xargs -I {} cp {} "$TEMP_DIR/static/" 2>/dev/null || true
fi

# Create .ebextensions for Django
echo "Creating .ebextensions..."
mkdir -p "$TEMP_DIR/.ebextensions"

cat > "$TEMP_DIR/.ebextensions/04_django.config" << 'EOF'
option_settings:
  aws:elasticbeanstalk:container:python:
    WSGIPath: pyfactor.wsgi:application
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /var/app/current
  aws:elasticbeanstalk:environment:proxy:staticfiles:
    /static: static
EOF

# Package creation
cd "$TEMP_DIR"
PACKAGE_NAME="oauth-api-minimal-$(date +%Y%m%d%H%M%S).zip"

echo "Creating deployment package..."
zip -r "$PACKAGE_NAME" . -x "*.pyc" "*__pycache__*" "*.git*" "node_modules/*" "venv/*" ".venv/*"

PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)
echo "✓ Package created: $PACKAGE_NAME ($PACKAGE_SIZE)"

# Check size limit
PACKAGE_SIZE_MB=$(du -m "$PACKAGE_NAME" | cut -f1)
if [ "$PACKAGE_SIZE_MB" -gt 500 ]; then
    echo "❌ Package size ($PACKAGE_SIZE_MB MB) exceeds 500MB limit!"
    echo "Reducing package size..."
    
    # Remove non-essential files and try again
    rm -rf static/* 2>/dev/null || true
    rm -f "$PACKAGE_NAME"
    zip -r "$PACKAGE_NAME" . -x "*.pyc" "*__pycache__*" "*.git*" "node_modules/*" "venv/*" ".venv/*"
    
    PACKAGE_SIZE_MB=$(du -m "$PACKAGE_NAME" | cut -f1)
    PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)
    echo "✓ Reduced package size: $PACKAGE_SIZE"
fi

if [ "$PACKAGE_SIZE_MB" -gt 500 ]; then
    echo "❌ Package still too large ($PACKAGE_SIZE_MB MB). Cannot deploy."
    exit 1
fi

# Upload to S3
echo "Uploading minimal package to S3..."
aws s3 cp "$PACKAGE_NAME" s3://elasticbeanstalk-us-east-1-211125768252/

# Deploy to Elastic Beanstalk
echo "Deploying minimal OAuth API to Elastic Beanstalk..."
aws elasticbeanstalk create-application-version \
    --application-name "Dott" \
    --version-label "oauth-api-minimal-$(date +%Y%m%d%H%M%S)" \
    --source-bundle S3Bucket="elasticbeanstalk-us-east-1-211125768252",S3Key="$PACKAGE_NAME" \
    --region us-east-1

VERSION_LABEL="oauth-api-minimal-$(date +%Y%m%d%H%M%S)"

echo "Updating environment with minimal OAuth API..."
aws elasticbeanstalk update-environment \
    --environment-name "Dott-env-fixed" \
    --version-label "$VERSION_LABEL" \
    --region us-east-1

echo "✅ Minimal OAuth API deployment initiated successfully!"
echo "🔗 Environment: Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com"
echo "📦 Package: $PACKAGE_NAME ($PACKAGE_SIZE)"
echo "🔄 Deployment Status: Check AWS Console for progress"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "==== DEPLOYMENT MONITORING ===="
echo "Monitor deployment status with:"
echo "aws elasticbeanstalk describe-environments --environment-names Dott-env-fixed --region us-east-1"
echo ""
echo "Expected OAuth API endpoints after deployment:"
echo "- POST https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/api/auth/signup/"
echo "- GET  https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/api/auth/profile/"
echo "- GET  https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/api/users/profile"
