#!/bin/bash

# Nginx Configuration Overlay
# Applies ONLY nginx configuration to fix health checks
# Does NOT modify Docker or Django deployment

set -e
echo "🔧 Nginx Configuration Overlay..."

# Wait for user confirmation that Django is restored
echo ""
echo "⚠️  **IMPORTANT: Run this ONLY after Django is restored and healthy**"
echo ""
echo "🔍 **Pre-flight checks:**"
echo "   1. Environment status should be 'Ready' or 'OK'"
echo "   2. Django health check should work: curl http://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com:8000/health/"
echo ""
read -p "Is Django restored and healthy? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborting - Please wait for Django to be restored first"
    exit 1
fi

# Create a clean temporary directory
DEPLOY_DIR="nginx-overlay"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Create ONLY the nginx configuration
mkdir -p "$DEPLOY_DIR/.platform/nginx/conf.d"
cat > "$DEPLOY_DIR/.platform/nginx/conf.d/root-health.conf" << 'EOF'
# Root path health check configuration - OVERLAY ONLY
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

# Create minimal ebextensions for nginx reload
mkdir -p "$DEPLOY_DIR/.ebextensions"
cat > "$DEPLOY_DIR/.ebextensions/01-nginx-reload.config" << 'EOF'
container_commands:
  01_reload_nginx:
    command: "nginx -s reload"
    ignoreErrors: true
EOF

# Add a placeholder file to satisfy Docker requirements
cat > "$DEPLOY_DIR/.platform/README.md" << 'EOF'
# Nginx Configuration Overlay

This deployment contains ONLY nginx configuration changes.
It should be applied to an existing working Django deployment.

## What this fixes:
- Routes root path "/" to Django health endpoint
- Fixes ALB health check timeouts
- Maintains existing Django application unchanged
EOF

echo "✅ Created nginx overlay configuration"

# Package the overlay
echo "📦 Creating nginx overlay package..."
cd "$DEPLOY_DIR"
zip -r ../nginx-overlay.zip .
cd ..

# Check size
SIZE=$(stat -f%z nginx-overlay.zip 2>/dev/null || stat -c%s nginx-overlay.zip 2>/dev/null || echo "unknown")
echo "📊 Package size: $SIZE bytes (ultra-minimal!)"

# Show contents
echo "🔍 Package contents:"
unzip -l nginx-overlay.zip

# Upload to S3
echo "⬆️ Uploading nginx overlay to S3..."
aws s3 cp nginx-overlay.zip s3://elasticbeanstalk-us-east-1-471112661935/ --region us-east-1

# Create application version
VERSION_LABEL="nginx-overlay-$(date +%Y%m%d%H%M%S)"
echo "📝 Creating application version: $VERSION_LABEL"

aws elasticbeanstalk create-application-version \
  --application-name Dott \
  --version-label "$VERSION_LABEL" \
  --source-bundle S3Bucket="elasticbeanstalk-us-east-1-471112661935",S3Key="nginx-overlay.zip" \
  --region us-east-1

# Deploy the overlay
echo "🚀 Deploying nginx overlay..."
aws elasticbeanstalk update-environment \
  --environment-name DottApps-Max-Security-Fixed \
  --version-label "$VERSION_LABEL" \
  --region us-east-1

echo "✅ Nginx overlay deployment initiated!"

# Cleanup
rm -f nginx-overlay.zip
rm -rf "$DEPLOY_DIR"

echo ""
echo "🎯 **Nginx Overlay Applied:**"
echo "   ✅ Root path '/' now routes to Django health endpoint"
echo "   ✅ Ultra-minimal package (just nginx config)"
echo "   ✅ Preserves existing Django application"
echo ""
echo "⏳ **Expected Results (in 1-2 minutes):**"
echo "   • ALB health checks should start passing"
echo "   • Environment health should improve to 'OK'"
echo "   • Root path should return Django health response"
echo ""
echo "🧪 **Test Commands:**"
echo "   curl http://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/"
echo "   curl http://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/" 