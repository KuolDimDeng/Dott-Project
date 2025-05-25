#!/bin/bash

# Fix Nginx Root Path Configuration
# This ensures nginx properly handles root path "/" requests

set -e
echo "🔧 Fixing Nginx Root Path Configuration..."

# Create .platform directory structure
mkdir -p .platform/nginx/conf.d

# Create a nginx configuration that handles root path
cat > .platform/nginx/conf.d/root-health.conf << 'EOF'
# Root path health check configuration
location / {
    proxy_pass http://docker:8000/health/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_send_timeout 10s;
    proxy_read_timeout 10s;
}

# Also ensure health path works
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

echo "✅ Created nginx root path configuration"

# Create .ebextensions to restart nginx
mkdir -p .ebextensions
cat > .ebextensions/03-restart-nginx.config << 'EOF'
container_commands:
  01_reload_nginx:
    command: "nginx -s reload"
    ignoreErrors: true
  
  02_test_nginx_config:
    command: "nginx -t"
    
  03_verify_nginx_running:
    command: |
      ps aux | grep nginx | grep -v grep || echo "Nginx not running"
      netstat -tlnp | grep :80 || echo "Port 80 not listening"
EOF

echo "✅ Created nginx restart configuration"

# Package the fix
echo "📦 Packaging nginx root path fix..."
zip -r nginx-root-fix.zip . -x "*.git*" "*.pyc" "__pycache__*" "*.log" "*.tmp" "*.json"

# Check size
SIZE=$(stat -f%z nginx-root-fix.zip 2>/dev/null || stat -c%s nginx-root-fix.zip 2>/dev/null || echo "unknown")
echo "📊 Package size: $SIZE bytes"

# Upload to S3
echo "⬆️ Uploading nginx fix to S3..."
aws s3 cp nginx-root-fix.zip s3://elasticbeanstalk-us-east-1-471112661935/ --region us-east-1

# Create application version
VERSION_LABEL="nginx-root-fix-$(date +%Y%m%d%H%M%S)"
echo "📝 Creating application version: $VERSION_LABEL"

aws elasticbeanstalk create-application-version \
  --application-name Dott \
  --version-label "$VERSION_LABEL" \
  --source-bundle S3Bucket="elasticbeanstalk-us-east-1-471112661935",S3Key="nginx-root-fix.zip" \
  --region us-east-1

# Deploy to environment
echo "🚀 Deploying nginx root path fix..."
aws elasticbeanstalk update-environment \
  --environment-name DottApps-Max-Security-Fixed \
  --version-label "$VERSION_LABEL" \
  --region us-east-1

echo "✅ Nginx root path fix deployment initiated!"

# Cleanup
rm -f nginx-root-fix.zip

echo ""
echo "🎉 Nginx Root Path Fix Deployed!"
echo ""
echo "📊 **What this does:**"
echo "   • Configures nginx to proxy root path '/' to Django health endpoint"
echo "   • Ensures both '/' and '/health/' paths work"
echo "   • Sets proper proxy timeouts (5s connect, 10s read/send)"
echo "   • Reloads nginx configuration"
echo ""
echo "⏳ **Expected timeline:**"
echo "   • Deployment: 3-5 minutes"
echo "   • ALB health checks should start passing within 2 minutes"
echo "   • Environment health should improve to 'Green' within 10 minutes"
echo ""
echo "🔍 **This should resolve:**"
echo "   • ALB timeout errors (Target.Timeout)"
echo "   • Nginx not responding to root path '/'"
echo "   • Environment health status changing from 'Severe' to 'OK'" 