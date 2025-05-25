#!/bin/bash

echo "🚀 Creating HTTPS environment (simplified)..."

APP_NAME="Dott"
NEW_ENV_NAME="Dott-env-https-final"
REGION="us-east-1"
CERT_ARN="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"

# Create ALB configuration
cat > simple-https-config.json << 'EOF'
[
  {
    "Namespace": "aws:elasticbeanstalk:environment",
    "OptionName": "LoadBalancerType",
    "Value": "application"
  },
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "Protocol",
    "Value": "HTTPS"
  },
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "SSLCertificateArns",
    "Value": "arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"
  }
]
EOF

echo "Creating environment..."
aws elasticbeanstalk create-environment \
    --application-name "$APP_NAME" \
    --environment-name "$NEW_ENV_NAME" \
    --solution-stack-name "64bit Amazon Linux 2023 v4.5.2 running Docker" \
    --version-label "vDott-20250523202843" \
    --option-settings file://simple-https-config.json \
    --region "$REGION"

echo ""
echo "✅ Environment creation initiated!"
echo "Environment name: $NEW_ENV_NAME"
echo ""
echo "📊 Monitor progress:"
echo "1. Check AWS Console: https://console.aws.amazon.com/elasticbeanstalk"
echo "2. Or run: aws elasticbeanstalk describe-environments --environment-names $NEW_ENV_NAME --region $REGION"
echo ""
echo "⏳ This will take 10-15 minutes to complete."
echo "The environment URL will be: https://$NEW_ENV_NAME.eba-yek4sdqp.us-east-1.elasticbeanstalk.com"

rm -f simple-https-config.json 