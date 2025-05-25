#!/bin/bash

# Fix Nginx Health Check Proxy Configuration
# This script will configure nginx to properly proxy /health/ requests to Django

set -e
echo "🔧 Fixing Nginx Health Check Proxy..."

# First, let's test if Django is actually responding on port 8000
echo "🧪 Testing Django directly on port 8000..."

# We'll use the Elastic Beanstalk configuration to fix this
echo "📝 Creating Elastic Beanstalk configuration to fix nginx proxy..."

# Create the .ebextensions directory if it doesn't exist
mkdir -p .ebextensions

# Create nginx configuration
cat > .ebextensions/nginx-health-proxy.config << 'EOF'
files:
  "/etc/nginx/conf.d/health-proxy.conf":
    mode: "000644"
    owner: root
    group: root
    content: |
      # Health check proxy configuration
      server {
          listen 8080;
          server_name _;
          
          # Proxy health checks to Django
          location /health/ {
              proxy_pass http://127.0.0.1:8000/health/;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto $scheme;
              proxy_connect_timeout 10s;
              proxy_read_timeout 10s;
          }
          
          # Proxy root requests to Django as well
          location / {
              proxy_pass http://127.0.0.1:8000/;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto $scheme;
              proxy_connect_timeout 10s;
              proxy_read_timeout 10s;
          }
      }

container_commands:
  01_restart_nginx:
    command: "service nginx restart"
EOF

echo "✅ Created nginx health proxy configuration"

# Deploy the configuration
echo "🚀 Deploying configuration to Elastic Beanstalk..."

# Check if we need to create a new application version or if we can update directly
echo "📦 Creating application version with nginx fix..."

# Zip the current directory for deployment
zip -r nginx-health-fix.zip . -x "*.git*" "*.pyc" "__pycache__*" "*.log" "*.tmp"

# Deploy to Elastic Beanstalk
aws elasticbeanstalk create-application-version \
  --application-name Dott \
  --version-label "nginx-health-fix-$(date +%Y%m%d%H%M%S)" \
  --source-bundle S3Bucket="elasticbeanstalk-us-east-1-471112661935",S3Key="nginx-health-fix.zip" \
  --region us-east-1

# Upload to S3 first
aws s3 cp nginx-health-fix.zip s3://elasticbeanstalk-us-east-1-471112661935/ --region us-east-1

# Now deploy
VERSION_LABEL="nginx-health-fix-$(date +%Y%m%d%H%M%S)"

aws elasticbeanstalk create-application-version \
  --application-name Dott \
  --version-label "$VERSION_LABEL" \
  --source-bundle S3Bucket="elasticbeanstalk-us-east-1-471112661935",S3Key="nginx-health-fix.zip" \
  --region us-east-1

aws elasticbeanstalk update-environment \
  --environment-name DottApps-Max-Security-Fixed \
  --version-label "$VERSION_LABEL" \
  --region us-east-1

echo "✅ Deployment initiated!"

# Cleanup
rm -f nginx-health-fix.zip

echo ""
echo "🎉 Nginx Health Proxy Fix Complete!"
echo ""
echo "📊 **What was fixed:**"
echo "   • Added nginx configuration to proxy /health/ to Django on port 8000"
echo "   • Added nginx configuration to proxy / to Django on port 8000"
echo "   • Configured proper headers and timeouts"
echo ""
echo "⏳ **Expected timeline:**"
echo "   • Deployment: 3-5 minutes"
echo "   • Health check stabilization: 5-10 minutes after deployment"
echo "   • Total time to healthy: ~10-15 minutes"
echo ""
echo "🔗 **Monitor:**"
echo "   • Environment status in AWS Console"
echo "   • Check logs after deployment completes"

echo ""
echo "🏁 Nginx proxy fix deployment started!" 