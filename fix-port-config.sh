#!/bin/bash

echo "🔧 Fixing port configuration for HTTPS environment..."

ENV_NAME="Dott-env-https-final"
REGION="us-east-1"

# Fix port configuration to match the working environment
cat > port-fix-config.json << 'EOF'
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
    "Namespace": "aws:elbv2:loadbalancer",
    "OptionName": "IdleTimeout",
    "Value": "60"
  }
]
EOF

echo "🔄 Updating port configuration..."
aws elasticbeanstalk update-environment \
    --environment-name "$ENV_NAME" \
    --option-settings file://port-fix-config.json \
    --region "$REGION"

echo "⏳ Environment update initiated (5-10 minutes)..."
echo ""
echo "📊 Monitor in AWS Console and test when complete:"
echo "curl https://Dott-env-https-final.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/"

# Cleanup
rm -f port-fix-config.json 