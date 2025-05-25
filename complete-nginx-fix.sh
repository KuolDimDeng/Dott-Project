#!/bin/bash

# Complete Nginx Fix with Docker Support
# Includes both nginx config AND minimal Docker config
# Uses existing Django container image

set -e
echo "🔧 Complete Nginx Fix with Docker Support..."

# Create deployment directory
DEPLOY_DIR="complete-nginx-fix"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo "📋 Creating minimal Dockerrun.aws.json..."
# Create minimal Dockerrun.aws.json that uses existing Django image
cat > "$DEPLOY_DIR/Dockerrun.aws.json" << 'EOF'
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "5428efe0d2de",
    "Update": "false"
  },
  "Ports": [
    {
      "ContainerPort": "8000"
    }
  ]
}
EOF

echo "🔧 Creating nginx configuration..."
# Create nginx configuration
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

# Explicit health path (redundant but safe)
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

echo "⚙️ Creating nginx reload configuration..."
# Create ebextensions for nginx reload
mkdir -p "$DEPLOY_DIR/.ebextensions"
cat > "$DEPLOY_DIR/.ebextensions/01-nginx-reload.config" << 'EOF'
commands:
  01_reload_nginx:
    command: "sudo systemctl reload nginx"
    ignoreErrors: false
EOF

echo "📦 Creating deployment package..."
cd "$DEPLOY_DIR"
zip -r "../complete-nginx-fix.zip" . > /dev/null
cd ..

echo "📊 Package contents:"
unzip -l complete-nginx-fix.zip

echo "📈 Package size: $(du -h complete-nginx-fix.zip | cut -f1)"

echo "⬆️ Uploading to S3..."
aws s3 cp complete-nginx-fix.zip s3://elasticbeanstalk-us-east-1-471112661935/

echo "📝 Creating application version..."
VERSION_LABEL="complete-nginx-fix-$(date +%Y%m%d%H%M%S)"
aws elasticbeanstalk create-application-version \
  --application-name Dott \
  --version-label "$VERSION_LABEL" \
  --source-bundle S3Bucket=elasticbeanstalk-us-east-1-471112661935,S3Key=complete-nginx-fix.zip \
  --region us-east-1 > /dev/null

echo "🚀 Deploying complete nginx fix..."
aws elasticbeanstalk update-environment \
  --environment-name DottApps-Max-Security-Fixed \
  --version-label "$VERSION_LABEL" \
  --region us-east-1 > /dev/null

echo ""
echo "✅ **Complete Nginx Fix Deployed!**"
echo ""
echo "📊 **What was deployed:**"
echo "   ✅ Dockerrun.aws.json (references existing Django image)"
echo "   ✅ Nginx configuration (routes / to Django health)"
echo "   ✅ Nginx reload script"
echo ""
echo "🎯 **Version:** $VERSION_LABEL"
echo ""
echo "⏳ **Expected results (in 2-3 minutes):**"
echo "   • Django container will be preserved"
echo "   • Nginx will route root path to health endpoint"
echo "   • ALB health checks should pass"
echo "   • Environment health should improve to 'OK'"

# Cleanup
rm -rf "$DEPLOY_DIR" complete-nginx-fix.zip 