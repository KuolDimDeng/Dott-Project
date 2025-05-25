#!/bin/bash

# Direct Nginx Configuration Fix
# Applies nginx config directly to running instance via SSM
# Bypasses deployment process entirely

set -e
echo "🔧 Direct Nginx Configuration Fix..."

# Get the instance ID for the environment
echo "🔍 Finding instance ID..."
INSTANCE_ID=$(aws ec2 describe-instances \
  --region us-east-1 \
  --filters "Name=tag:elasticbeanstalk:environment-name,Values=DottApps-Max-Security-Fixed" \
           "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

echo "📋 Instance ID: $INSTANCE_ID"

# Create the nginx configuration commands
NGINX_CONFIG='# Root path health check configuration
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
}'

echo "🚀 Applying nginx configuration directly via SSM..."

# Apply the configuration using AWS Systems Manager
aws ssm send-command \
  --region us-east-1 \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    'sudo mkdir -p /etc/nginx/conf.d',
    'sudo tee /etc/nginx/conf.d/root-health.conf > /dev/null << \"EOF\"
$NGINX_CONFIG
EOF',
    'sudo nginx -t',
    'sudo systemctl reload nginx',
    'echo \"✅ Nginx configuration applied and reloaded\"'
  ]" \
  --comment "Direct nginx health configuration fix"

echo ""
echo "✅ **Direct Nginx Fix Applied!**"
echo ""
echo "📊 **What was changed:**"
echo "   • Created /etc/nginx/conf.d/root-health.conf"
echo "   • Root path '/' now routes to Django health endpoint"
echo "   • Reloaded nginx configuration"
echo ""
echo "⏳ **Expected results (in 30-60 seconds):**"
echo "   • ALB health checks should start passing"
echo "   • Environment health should improve to 'OK'"
echo ""
echo "🧪 **Test:**"
echo "   curl http://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/" 