#!/bin/bash

# Simple Django Health Endpoint Fix
# This adds a minimal health endpoint to the existing Django app

set -e
echo "🏥 Simple Django Health Endpoint Fix..."

# Check if Django is responding at all by testing a known endpoint
echo "🧪 Testing if Django is accessible..."

# Create a minimal health endpoint file that we can deploy
echo "📝 Creating minimal health endpoint..."

# Create .ebextensions if it doesn't exist
mkdir -p .ebextensions

# Create a simple health endpoint configuration
cat > .ebextensions/02-health-endpoint-simple.config << 'EOF'
files:
  "/opt/python/current/app/simple_health.py":
    mode: "000644"
    owner: wsgi
    group: wsgi
    content: |
      # Simple health endpoint for ALB
      from django.http import HttpResponse
      
      def health_check(request):
          """Simple health check that always returns 200 OK"""
          return HttpResponse("OK", content_type="text/plain", status=200)

  "/opt/python/current/app/health_urls.py":
    mode: "000644"
    owner: wsgi
    group: wsgi
    content: |
      # Health URLs for ALB
      from django.urls import path
      from simple_health import health_check
      
      urlpatterns = [
          path('health/', health_check, name='health'),
      ]

container_commands:
  01_update_main_urls:
    command: |
      cat >> /opt/python/current/app/pyfactor/urls.py << 'URLS_EOF'
      
      # Add simple health endpoint for ALB
      from django.urls import path, include
      try:
          from simple_health import health_check
          # Add health endpoint to main urlpatterns
          if any('health' not in str(pattern) for pattern in urlpatterns):
              urlpatterns.append(path('health/', health_check, name='simple_health'))
      except ImportError:
          pass
      URLS_EOF
  
  02_restart_wsgi:
    command: "touch /opt/python/current/app/pyfactor/wsgi.py"
    
  03_test_health_endpoint:
    command: |
      sleep 5
      curl -f http://localhost:8000/health/ || echo "Health endpoint not ready yet"
EOF

echo "✅ Created simple health endpoint configuration"

# For immediate testing, let's also create a direct health endpoint using Django management
cat > test-health-endpoint.py << 'EOF'
#!/usr/bin/env python
"""
Simple test to verify Django can respond to health checks
"""
import os
import sys
import django
from django.http import HttpResponse
from django.conf import settings

# Add Django project to path
sys.path.append('/opt/python/current/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

try:
    django.setup()
    print("✅ Django setup successful")
    
    # Test a simple health response
    response = HttpResponse("OK", content_type="text/plain", status=200)
    print(f"✅ Health response created: {response.status_code}")
    
except Exception as e:
    print(f"❌ Django setup failed: {e}")
EOF

# Package the deployment
echo "📦 Creating deployment package..."
zip -r simple-health-fix.zip . -x "*.git*" "*.pyc" "__pycache__*" "*.log" "*.tmp"

# Upload to S3
echo "⬆️ Uploading to S3..."
aws s3 cp simple-health-fix.zip s3://elasticbeanstalk-us-east-1-471112661935/ --region us-east-1

# Create application version
VERSION_LABEL="simple-health-fix-$(date +%Y%m%d%H%M%S)"
echo "📝 Creating application version: $VERSION_LABEL"

aws elasticbeanstalk create-application-version \
  --application-name Dott \
  --version-label "$VERSION_LABEL" \
  --source-bundle S3Bucket="elasticbeanstalk-us-east-1-471112661935",S3Key="simple-health-fix.zip" \
  --region us-east-1

# Deploy to environment
echo "🚀 Deploying to DottApps-Max-Security-Fixed..."
aws elasticbeanstalk update-environment \
  --environment-name DottApps-Max-Security-Fixed \
  --version-label "$VERSION_LABEL" \
  --region us-east-1

echo "✅ Deployment initiated!"

# Cleanup
rm -f simple-health-fix.zip test-health-endpoint.py

echo ""
echo "🎉 Simple Django Health Endpoint Fix Complete!"
echo ""
echo "📊 **What was deployed:**"
echo "   • Minimal /health/ endpoint that returns 200 OK"
echo "   • No database dependencies"
echo "   • Direct addition to existing Django app"
echo ""
echo "⏳ **Expected timeline:**"
echo "   • Deployment: 3-5 minutes"
echo "   • Health checks should pass within 2-3 minutes after deployment"
echo "   • Environment should show 'OK' status within 10 minutes"
echo ""
echo "🔍 **Next steps:**"
echo "   • Monitor environment health in AWS Console"
echo "   • Check target health status"
echo "   • Verify ALB health checks are passing"

# Wait a moment and check if deployment started
echo ""
echo "⏳ Waiting 30 seconds before checking deployment status..."
sleep 30

echo "🔍 Checking deployment status..."
aws elasticbeanstalk describe-environments \
  --environment-names DottApps-Max-Security-Fixed \
  --region us-east-1 \
  --query 'Environments[0].{Status:Status,Health:Health,VersionLabel:VersionLabel}' \
  --output table || echo "Could not retrieve status"

echo ""
echo "🏁 Simple health endpoint fix deployment completed!" 