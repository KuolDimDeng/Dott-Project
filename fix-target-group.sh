#!/bin/bash

echo "🎯 Fixing target group routing for HTTPS environment..."

ENV_NAME="Dott-env-https-final"
REGION="us-east-1"

# Complete target group and process configuration
cat > target-group-fix.json << 'EOF'
[
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:default",
    "OptionName": "Port",
    "Value": "8000"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:default",
    "OptionName": "Protocol",
    "Value": "HTTP"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:default",
    "OptionName": "HealthCheckPath",
    "Value": "/health/"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:default",
    "OptionName": "HealthCheckInterval",
    "Value": "15"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:default",
    "OptionName": "HealthCheckTimeout",
    "Value": "5"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:default",
    "OptionName": "HealthyThresholdCount",
    "Value": "3"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:default",
    "OptionName": "UnhealthyThresholdCount",
    "Value": "5"
  },
  {
    "Namespace": "aws:elbv2:loadbalancer",
    "OptionName": "IdleTimeout",
    "Value": "60"
  }
]
EOF

echo "🔄 Applying target group configuration..."
aws elasticbeanstalk update-environment \
    --environment-name "$ENV_NAME" \
    --option-settings file://target-group-fix.json \
    --region "$REGION"

echo "⏳ This may take 5-10 minutes to complete..."
echo ""
echo "📝 **MEANWHILE: Use browser workaround to sign in immediately!**"
echo "1. Go to https://www.dottapps.com"
echo "2. Click shield icon and allow mixed content"
echo "3. Sign in normally"

# Cleanup
rm -f target-group-fix.json 