#!/bin/bash
# Version 0095: Fix nginx configuration conflicts
# This script removes conflicting nginx configs and files to fix deployment
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Version 0095: Fix nginx configuration conflicts ==="
echo "Backend directory: $BACKEND_DIR"

cd "$BACKEND_DIR"

# Remove any existing deployment package
rm -f eb-deployment.zip

# Remove conflicting files that cause nginx issues
echo "Removing conflicting configuration files..."

# Remove docker-compose.yml if it exists (conflicts with Dockerrun.aws.json)
if [ -f "docker-compose.yml" ]; then
    echo "Removing docker-compose.yml (conflicts with Dockerrun.aws.json)"
    rm -f docker-compose.yml
fi

# Remove any nginx override configurations that might conflict
if [ -d ".ebextensions" ]; then
    echo "Removing nginx configuration files from .ebextensions..."
    find .ebextensions -name "*nginx*" -delete 2>/dev/null || true
    find .ebextensions -name "*proxy*" -delete 2>/dev/null || true
    find .ebextensions -name "*01_reload*" -delete 2>/dev/null || true
fi

# Remove .platform nginx configs that might conflict
if [ -d ".platform" ]; then
    echo "Removing conflicting .platform configurations..."
    rm -rf .platform/nginx/conf.d/* 2>/dev/null || true
    rm -rf .platform/hooks/postdeploy/* 2>/dev/null || true
fi

# Keep only essential files for deployment
echo "Creating clean deployment package..."

# Create a minimal .ebextensions with only essential configs
mkdir -p .ebextensions
cat > .ebextensions/01_environment.config << 'EOF'
option_settings:
  aws:elasticbeanstalk:environment:proxy:staticfiles:
    /static: static
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings
    PYTHONPATH: /app
EOF

# Ensure Dockerrun.aws.json is properly configured
cat > Dockerrun.aws.json << 'EOF'
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "python:3.12",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": "8000"
    }
  ],
  "Volumes": [],
  "Logging": "/var/log/eb-docker/containers/eb-current-app"
}
EOF

# Create deployment package with specific files
echo "Creating deployment package..."
zip -r eb-deployment.zip \
    Dockerfile \
    Dockerrun.aws.json \
    requirements.txt \
    manage.py \
    pyfactor/ \
    custom_auth/ \
    onboarding/ \
    health/ \
    users/ \
    .ebextensions/ \
    -x "*.pyc" "*/__pycache__/*" "*/migrations/*.pyc" "*/.git/*" "*/node_modules/*" "*/venv/*" "*/.venv/*"

# Display package info
ls -lh eb-deployment.zip
echo ""
echo "=== Deployment Package Created ==="
echo "Size: $(ls -lh eb-deployment.zip | awk '{print $5}')"
echo ""
echo "=== Fixed Issues ==="
echo "✅ Removed docker-compose.yml (conflicted with Dockerrun.aws.json)"
echo "✅ Removed nginx configuration conflicts"
echo "✅ Cleaned .ebextensions and .platform directories"
echo "✅ Created minimal essential configuration"
echo ""
echo "=== Next Steps ==="
echo "This package should deploy without nginx conflicts."
echo "The application will use default Docker nginx proxy configuration." 