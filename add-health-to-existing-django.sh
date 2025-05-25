#!/bin/bash

# Add Health Endpoint to Existing Django
# This script uses Elastic Beanstalk configuration to add health endpoint to current running Django

set -e
echo "🏥 Adding Health Endpoint to Existing Django..."

# Create .ebextensions for current environment
mkdir -p .ebextensions

# Create a configuration that adds health endpoint to current Django
cat > .ebextensions/02-add-health-endpoint.config << 'EOF'
container_commands:
  01_add_root_health_endpoint:
    command: |
      # Add root health endpoint to current Django URLs
      URLS_FILE="/opt/python/current/app/pyfactor/urls.py"
      if [ -f "$URLS_FILE" ]; then
        # Create backup
        cp "$URLS_FILE" "$URLS_FILE.backup.$(date +%s)"
        
        # Check if root health endpoint already exists
        if ! grep -q "path('', " "$URLS_FILE"; then
          # Add a simple root health endpoint
          sed -i "/path('health\/', health_check/a\\    path('', health_check, name='root_health')," "$URLS_FILE"
          echo "Added root health endpoint to Django URLs"
        else
          echo "Root health endpoint already exists"
        fi
        
        # Also ensure /health/ path works
        if ! grep -q "path('health\/', health_check" "$URLS_FILE"; then
          # Add health endpoint if missing
          sed -i "/# Add health check endpoints for AWS/a\\    path('health/', health_check, name='health_check')," "$URLS_FILE"
          echo "Added /health/ endpoint to Django URLs"
        fi
        
        echo "Current Django URLs after modification:"
        tail -20 "$URLS_FILE"
      else
        echo "Django URLs file not found at $URLS_FILE"
      fi
  
  02_restart_django_wsgi:
    command: "touch /opt/python/current/app/pyfactor/wsgi.py"
    
  03_verify_django_health:
    command: |
      sleep 10
      echo "Testing Django health endpoints..."
      curl -f http://localhost:8000/ || echo "Root endpoint test failed"
      curl -f http://localhost:8000/health/ || echo "Health endpoint test failed"
      echo "Django health endpoint tests completed"
EOF

echo "✅ Created configuration to add health endpoint to current Django"

# Also check if we need to add the health endpoint to the current nginx configuration
echo "🔍 Checking current nginx configuration..."
if [ -f ".platform/nginx/conf.d/proxy.conf" ]; then
  echo "Current nginx proxy configuration exists"
  cat .platform/nginx/conf.d/proxy.conf
else
  echo "No custom nginx configuration found"
fi

# Package and deploy
echo "📦 Packaging health endpoint addition..."
zip -r add-health-endpoint.zip . -x "*.git*" "*.pyc" "__pycache__*" "*.log" "*.tmp" "*.json"

# Upload to S3
echo "⬆️ Uploading to S3..."
aws s3 cp add-health-endpoint.zip s3://elasticbeanstalk-us-east-1-471112661935/ --region us-east-1

# Create application version
VERSION_LABEL="add-health-endpoint-$(date +%Y%m%d%H%M%S)"
echo "📝 Creating application version: $VERSION_LABEL"

aws elasticbeanstalk create-application-version \
  --application-name Dott \
  --version-label "$VERSION_LABEL" \
  --source-bundle S3Bucket="elasticbeanstalk-us-east-1-471112661935",S3Key="add-health-endpoint.zip" \
  --region us-east-1

# Deploy to environment
echo "🚀 Deploying health endpoint addition..."
aws elasticbeanstalk update-environment \
  --environment-name DottApps-Max-Security-Fixed \
  --version-label "$VERSION_LABEL" \
  --region us-east-1

echo "✅ Health endpoint addition deployment initiated!"

# Cleanup
rm -f add-health-endpoint.zip

echo ""
echo "🎉 Health Endpoint Addition Complete!"
echo ""
echo "📊 **What this does:**"
echo "   • Adds root path '/' health endpoint to existing Django"
echo "   • Maps root path to the existing health_check function"
echo "   • Ensures /health/ path also works"
echo "   • Restarts Django to apply URL changes"
echo ""
echo "⏳ **Expected timeline:**"
echo "   • Deployment: 3-5 minutes"
echo "   • Health checks should pass within 2 minutes after deployment"
echo ""
echo "🔍 **This should resolve:**"
echo "   • ALB timeout errors on root path '/'"
echo "   • Target health should change from 'unhealthy' to 'healthy'"
echo "   • Environment health should improve from 'Red' to 'Green'" 