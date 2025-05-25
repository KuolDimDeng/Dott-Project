#!/bin/bash

# Fix HTTPS Configuration for Elastic Beanstalk
set -e

echo "🔧 Fixing HTTPS configuration for Dott-env-fixed..."

ENV_NAME="Dott-env-fixed"
REGION="us-east-1"
CERT_ARN="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"

echo "📋 Current environment status:"
aws elasticbeanstalk describe-environments --environment-names "$ENV_NAME" --region "$REGION" --query 'Environments[0].{Status:Status,Health:Health}' --output table

echo ""
echo "🔒 Applying HTTPS configuration..."

# Create temporary configuration file
cat > temp-https-config.json << EOF
[
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "Protocol",
    "Value": "HTTPS"
  },
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "SSLCertificateArns",
    "Value": "$CERT_ARN"
  }
]
EOF

echo "📝 Updating environment with HTTPS listeners..."
aws elasticbeanstalk update-environment \
    --environment-name "$ENV_NAME" \
    --option-settings file://temp-https-config.json \
    --region "$REGION"

echo "⏳ Waiting for environment update (this may take 5-10 minutes)..."
aws elasticbeanstalk wait environment-updated --environment-name "$ENV_NAME" --region "$REGION"

echo ""
echo "✅ HTTPS configuration completed!"
echo "Testing endpoints:"

# Test HTTP (should work)
echo "🔍 Testing HTTP..."
HTTP_URL="http://Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/"
if curl -s --max-time 10 "$HTTP_URL" > /dev/null; then
    echo "✅ HTTP endpoint working"
else
    echo "❌ HTTP endpoint failed"
fi

# Test HTTPS (should work after configuration)
echo "🔍 Testing HTTPS..."
HTTPS_URL="https://Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/"
if curl -s --max-time 10 -k "$HTTPS_URL" > /dev/null; then
    echo "✅ HTTPS endpoint working"
    echo "🎉 Success! Backend now supports HTTPS"
else
    echo "❌ HTTPS endpoint failed - may need additional configuration"
fi

# Cleanup
rm -f temp-https-config.json

echo ""
echo "🔗 Your backend URLs:"
echo "HTTP:  http://Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com"
echo "HTTPS: https://Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com" 