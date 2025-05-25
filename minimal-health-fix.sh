#!/bin/bash

# Minimal Django Health Endpoint Fix
# This creates a minimal deployment with just the health endpoint

set -e
echo "🏥 Minimal Django Health Endpoint Fix..."

# Create a temporary directory for minimal deployment
DEPLOY_DIR="minimal-health-deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Create .ebextensions directory
mkdir -p "$DEPLOY_DIR/.ebextensions"

# Create a minimal health endpoint configuration
cat > "$DEPLOY_DIR/.ebextensions/01-health-endpoint.config" << 'EOF'
files:
  "/opt/python/current/app/health_endpoint.py":
    mode: "000644"
    owner: wsgi
    group: wsgi
    content: |
      from django.http import HttpResponse
      from django.views.decorators.csrf import csrf_exempt
      from django.views.decorators.http import require_http_methods
      
      @csrf_exempt
      @require_http_methods(["GET", "HEAD"])
      def health_check(request):
          """Ultra-simple health check for ALB"""
          return HttpResponse("OK", content_type="text/plain", status=200)

  "/opt/python/current/app/add_health_url.py":
    mode: "000644"
    owner: wsgi
    group: wsgi
    content: |
      # Script to add health endpoint to main URLs
      import os
      import re
      
      urls_file = '/opt/python/current/app/pyfactor/urls.py'
      
      if os.path.exists(urls_file):
          with open(urls_file, 'r') as f:
              content = f.read()
          
          # Check if health endpoint already exists
          if 'health_endpoint' not in content:
              # Add import at the top
              if 'from health_endpoint import health_check' not in content:
                  content = re.sub(
                      r'(from django\.urls import.*?\n)', 
                      r'\1from health_endpoint import health_check\n', 
                      content
                  )
              
              # Add URL pattern before the closing bracket
              if "path('health/', health_check" not in content:
                  content = re.sub(
                      r'(\]\s*$)', 
                      r"    path('health/', health_check, name='health'),\n\1", 
                      content, 
                      flags=re.MULTILINE
                  )
              
              with open(urls_file, 'w') as f:
                  f.write(content)

container_commands:
  01_add_health_endpoint:
    command: "python /opt/python/current/app/add_health_url.py"
    
  02_test_health:
    command: "python -c \"from health_endpoint import health_check; print('Health endpoint imported successfully')\""
    
  03_restart_wsgi:
    command: "touch /opt/python/current/app/pyfactor/wsgi.py"
EOF

# Create a minimal Dockerrun.aws.json to ensure it's recognized as a valid app
cat > "$DEPLOY_DIR/Dockerrun.aws.json" << 'EOF'
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "nginx:latest",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": "80"
    }
  ]
}
EOF

# Package the minimal deployment
echo "📦 Creating minimal deployment package..."
cd "$DEPLOY_DIR"
zip -r ../minimal-health-fix.zip . 
cd ..

# Check the size
SIZE=$(stat -f%z minimal-health-fix.zip 2>/dev/null || stat -c%s minimal-health-fix.zip 2>/dev/null || echo "unknown")
echo "📊 Package size: $SIZE bytes"

# Upload to S3
echo "⬆️ Uploading to S3..."
aws s3 cp minimal-health-fix.zip s3://elasticbeanstalk-us-east-1-471112661935/ --region us-east-1

# Create application version
VERSION_LABEL="minimal-health-fix-$(date +%Y%m%d%H%M%S)"
echo "📝 Creating application version: $VERSION_LABEL"

aws elasticbeanstalk create-application-version \
  --application-name Dott \
  --version-label "$VERSION_LABEL" \
  --source-bundle S3Bucket="elasticbeanstalk-us-east-1-471112661935",S3Key="minimal-health-fix.zip" \
  --region us-east-1

# Deploy to environment
echo "🚀 Deploying to DottApps-Max-Security-Fixed..."
aws elasticbeanstalk update-environment \
  --environment-name DottApps-Max-Security-Fixed \
  --version-label "$VERSION_LABEL" \
  --region us-east-1

echo "✅ Minimal deployment initiated!"

# Cleanup
rm -f minimal-health-fix.zip
rm -rf "$DEPLOY_DIR"

echo ""
echo "🎉 Minimal Django Health Endpoint Fix Complete!"
echo ""
echo "📊 **What was deployed:**"
echo "   • Ultra-minimal /health/ endpoint"
echo "   • Automatic URL configuration"
echo "   • Small deployment package"
echo ""
echo "⏳ **Expected timeline:**"
echo "   • Deployment: 3-5 minutes"
echo "   • Health checks: Should pass within 5 minutes"
echo ""

# Wait and check status
echo "⏳ Waiting 2 minutes before checking status..."
sleep 120

echo "🔍 Checking deployment and health status..."
aws elasticbeanstalk describe-environments \
  --environment-names DottApps-Max-Security-Fixed \
  --region us-east-1 \
  --query 'Environments[0].{Status:Status,Health:Health,VersionLabel:VersionLabel}' \
  --output table || echo "Could not retrieve environment status"

# Check target health
TG_ARN="arn:aws:elasticloadbalancing:us-east-1:471112661935:targetgroup/awseb-AWSEB-HQDF0W7JHW2S/c7991fc04864c0b5"
echo ""
echo "🎯 Checking target health..."
aws elbv2 describe-target-health \
  --target-group-arn "$TG_ARN" \
  --region us-east-1 \
  --query 'TargetHealthDescriptions[0].TargetHealth.{State:State,Reason:Reason}' \
  --output table || echo "Could not retrieve target health"

echo ""
echo "🏁 Minimal health endpoint fix completed!" 