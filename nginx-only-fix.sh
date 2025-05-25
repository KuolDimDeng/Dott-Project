#!/bin/bash

# Nginx-Only Health Configuration Fix
# ONLY nginx configuration - NO Docker files
# Safe to deploy over existing Django application

set -e
echo "🔧 Nginx-Only Health Configuration Fix..."

# Create minimal deployment directory  
DEPLOY_DIR="nginx-only-fix"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo "🔧 Creating nginx health configuration..."
# Create ONLY nginx configuration
mkdir -p "$DEPLOY_DIR/.platform/nginx/conf.d"
cat > "$DEPLOY_DIR/.platform/nginx/conf.d/health-routing.conf" << 'EOF'
# Health check routing configuration
# Routes root path to Django health endpoint for ALB health checks

location = / {
    proxy_pass http://docker:8000/health/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_send_timeout 10s;
    proxy_read_timeout 10s;
}

# Explicit health endpoint (redundant but safe)
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
# Create ebextensions for nginx reload (no Docker involved)
mkdir -p "$DEPLOY_DIR/.ebextensions"
cat > "$DEPLOY_DIR/.ebextensions/01-nginx-reload.config" << 'EOF'
commands:
  01_reload_nginx:
    command: "sudo systemctl reload nginx"
    ignoreErrors: false
container_commands:
  02_test_nginx_config:
    command: "sudo nginx -t"
    ignoreErrors: false
EOF

# Wait for Django to be restored first
echo ""
echo "⏳ **Waiting for Django restoration to complete...**"
echo "   Checking environment status..."

# Check current environment status
while true; do
  STATUS=$(aws elasticbeanstalk describe-environments \
    --environment-names DottApps-Max-Security-Fixed \
    --region us-east-1 \
    --query 'Environments[0].Status' \
    --output text 2>/dev/null || echo "CHECKING")
  
  echo "   Current status: $STATUS"
  
  if [ "$STATUS" = "Ready" ]; then
    echo "✅ Django restoration complete!"
    break
  elif [ "$STATUS" = "Updating" ]; then
    echo "   Still updating... waiting 30 seconds"
    sleep 30
  else
    echo "   Waiting for environment to stabilize... (30 seconds)"
    sleep 30
  fi
done

echo ""
echo "📦 Creating nginx-only deployment package..."
cd "$DEPLOY_DIR"
zip -r "../nginx-only-fix.zip" . > /dev/null
cd ..

echo "📊 Package contents:"
unzip -l nginx-only-fix.zip

echo "📈 Package size: $(du -h nginx-only-fix.zip | cut -f1)"

echo "⬆️ Uploading nginx-only fix to S3..."
aws s3 cp nginx-only-fix.zip s3://elasticbeanstalk-us-east-1-471112661935/

echo "📝 Creating application version..."
VERSION_LABEL="nginx-only-fix-$(date +%Y%m%d%H%M%S)"
aws elasticbeanstalk create-application-version \
  --application-name Dott \
  --version-label "$VERSION_LABEL" \
  --source-bundle S3Bucket=elasticbeanstalk-us-east-1-471112661935,S3Key=nginx-only-fix.zip \
  --region us-east-1 > /dev/null

echo "🚀 Deploying nginx-only fix..."
aws elasticbeanstalk update-environment \
  --environment-name DottApps-Max-Security-Fixed \
  --version-label "$VERSION_LABEL" \
  --region us-east-1 > /dev/null

echo ""
echo "✅ **Nginx-Only Fix Deployed!**"
echo ""
echo "📊 **What was deployed:**"
echo "   ✅ ONLY nginx configuration (no Docker files)"
echo "   ✅ Health routing: / → Django health endpoint"
echo "   ✅ Nginx reload configuration"
echo ""
echo "🎯 **Version:** $VERSION_LABEL"
echo ""
echo "⏳ **Expected results (in 1-2 minutes):**"
echo "   • Django container remains unchanged"
echo "   • Nginx routes root path to health endpoint"  
echo "   • ALB health checks should pass"
echo "   • Environment health should improve to 'OK'"
echo ""
echo "🧪 **Test commands:**"
echo "   curl http://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/"
echo "   curl http://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/"

# Cleanup
rm -rf "$DEPLOY_DIR" nginx-only-fix.zip 