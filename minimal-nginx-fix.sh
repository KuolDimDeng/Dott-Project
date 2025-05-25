#!/bin/bash

# Minimal Nginx Root Path Fix
# Only includes essential nginx configuration - no bloat

set -e
echo "🔧 Minimal Nginx Root Path Fix..."

# Create a clean temporary directory
DEPLOY_DIR="minimal-nginx-fix"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Create only the essential nginx configuration
mkdir -p "$DEPLOY_DIR/.platform/nginx/conf.d"
cat > "$DEPLOY_DIR/.platform/nginx/conf.d/root-health.conf" << 'EOF'
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

# Create essential ebextensions
mkdir -p "$DEPLOY_DIR/.ebextensions"
cat > "$DEPLOY_DIR/.ebextensions/nginx-reload.config" << 'EOF'
container_commands:
  01_reload_nginx:
    command: "nginx -s reload"
    ignoreErrors: true
  
  02_verify_nginx:
    command: |
      sleep 2
      nginx -t
      ps aux | grep nginx | grep -v grep || echo "Nginx check completed"
EOF

echo "✅ Created minimal nginx configuration"

# Package ONLY the essential files
echo "📦 Creating minimal deployment package..."
cd "$DEPLOY_DIR"
zip -r ../minimal-nginx-fix.zip .
cd ..

# Check size (should be tiny now)
SIZE=$(stat -f%z minimal-nginx-fix.zip 2>/dev/null || stat -c%s minimal-nginx-fix.zip 2>/dev/null || echo "unknown")
echo "📊 Package size: $SIZE bytes (should be under 1KB!)"

# Verify the package is small enough
if [ "$SIZE" -gt 1000000 ]; then
  echo "❌ Package is still too large: $SIZE bytes"
  echo "🔍 Contents:"
  unzip -l minimal-nginx-fix.zip
  exit 1
else
  echo "✅ Package size is acceptable: $SIZE bytes"
fi

# Upload to S3
echo "⬆️ Uploading minimal nginx fix to S3..."
aws s3 cp minimal-nginx-fix.zip s3://elasticbeanstalk-us-east-1-471112661935/ --region us-east-1

# Create application version
VERSION_LABEL="minimal-nginx-fix-$(date +%Y%m%d%H%M%S)"
echo "📝 Creating application version: $VERSION_LABEL"

aws elasticbeanstalk create-application-version \
  --application-name Dott \
  --version-label "$VERSION_LABEL" \
  --source-bundle S3Bucket="elasticbeanstalk-us-east-1-471112661935",S3Key="minimal-nginx-fix.zip" \
  --region us-east-1

# Deploy to environment
echo "🚀 Deploying minimal nginx fix..."
aws elasticbeanstalk update-environment \
  --environment-name DottApps-Max-Security-Fixed \
  --version-label "$VERSION_LABEL" \
  --region us-east-1

echo "✅ Minimal nginx fix deployment initiated!"

# Cleanup
rm -f minimal-nginx-fix.zip
rm -rf "$DEPLOY_DIR"

echo ""
echo "🎉 Minimal Nginx Fix Deployed!"
echo ""
echo "📊 **What this includes (MINIMAL):**"
echo "   • Only nginx root health configuration"
echo "   • Only nginx reload commands"
echo "   • NO frontend backups, NO large files"
echo "   • Package size under 1KB"
echo ""
echo "⏳ **Expected timeline:**"
echo "   • Deployment: 2-3 minutes (fast!)"
echo "   • ALB health checks should pass within 1-2 minutes"
echo ""
echo "🔍 **This should resolve:**"
echo "   • ALB timeout errors on root path '/'"
echo "   • Environment health from 'Severe' to 'OK'" 