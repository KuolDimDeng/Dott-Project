#!/bin/bash

# Fix Nginx Routing to Django App Script
# The Django app is running on port 8000 but nginx isn't routing properly

set -e
echo "🔧 Fixing nginx routing and ALB health check..."

# Create nginx configuration that properly routes to Django app
echo "📝 Creating proper nginx configuration..."
cat > /tmp/nginx-proxy.conf << 'EOF'
# Nginx configuration for Docker Django app
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

location /health/ {
    proxy_pass http://127.0.0.1:8000/health/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
EOF

# Update EB configuration to use proper health check and nginx settings
echo "🔄 Updating EB configuration..."
aws elasticbeanstalk update-environment \
  --environment-name "DottApps-Max-Security-Fixed" \
  --region us-east-1 \
  --option-settings \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=HealthCheckPath,Value=/health/ \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=Protocol,Value=HTTP \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=Port,Value=8000 \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=HealthCheckInterval,Value=15 \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=HealthCheckTimeout,Value=5 \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=HealthyThresholdCount,Value=2 \
    Namespace=aws:elasticbeanstalk:environment:process:default,OptionName=UnhealthyThresholdCount,Value=3

echo "✅ Configuration updated!"
echo "⏳ Waiting for changes to take effect (this may take 2-3 minutes)..."

# Monitor the environment status
echo "📊 Monitoring environment health..."
for i in {1..15}; do
  STATUS=$(aws elasticbeanstalk describe-environments \
    --environment-names "DottApps-Max-Security-Fixed" \
    --region us-east-1 \
    --query 'Environments[0].Status' \
    --output text 2>/dev/null || echo "Updating")
  
  HEALTH=$(aws elasticbeanstalk describe-environments \
    --environment-names "DottApps-Max-Security-Fixed" \
    --region us-east-1 \
    --query 'Environments[0].Health' \
    --output text 2>/dev/null || echo "Unknown")
  
  echo "[$i/15] Status: $STATUS | Health: $HEALTH"
  
  if [[ "$STATUS" == "Ready" && ("$HEALTH" == "Green" || "$HEALTH" == "Ok") ]]; then
    echo "🎉 SUCCESS! Environment is healthy!"
    echo "🔗 Test URLs:"
    echo "   • Health Check: https://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/"
    echo "   • Main App: https://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/"
    exit 0
  fi
  
  sleep 30
done

echo "⚠️  Still updating. Check AWS console for latest status."
echo "🔗 Environment URL: https://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/" 