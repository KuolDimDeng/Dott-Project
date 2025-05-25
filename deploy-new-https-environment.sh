#!/bin/bash

# Deploy New HTTPS-Enabled Environment
set -e

echo "🚀 Creating new HTTPS-enabled environment..."

APP_NAME="Dott"
NEW_ENV_NAME="Dott-env-https-final"
REGION="us-east-1"
CERT_ARN="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"

# Get the version from the working environment
echo "📋 Getting application version from working environment..."
VERSION_LABEL=$(aws elasticbeanstalk describe-environments \
    --environment-names "Dott-env-fixed" \
    --region "$REGION" \
    --query 'Environments[0].VersionLabel' \
    --output text)

echo "Using version: $VERSION_LABEL"

# Create complete configuration for Application Load Balancer with HTTPS
cat > alb-https-config.json << EOF
[
  {
    "Namespace": "aws:elasticbeanstalk:environment",
    "OptionName": "ServiceRole",
    "Value": "arn:aws:iam::471112661935:role/aws-elasticbeanstalk-service-role"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment",
    "OptionName": "EnvironmentType",
    "Value": "LoadBalanced"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment",
    "OptionName": "LoadBalancerType",
    "Value": "application"
  },
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "IamInstanceProfile",
    "Value": "aws-elasticbeanstalk-ec2-role"
  },
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "InstanceType",
    "Value": "t3.medium"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "DJANGO_SETTINGS_MODULE",
    "Value": "pyfactor.settings_eb"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "DEBUG",
    "Value": "False"
  },
  {
    "Namespace": "aws:elbv2:listener:80",
    "OptionName": "Protocol",
    "Value": "HTTP"
  },
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "Protocol",
    "Value": "HTTPS"
  },
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "SSLCertificateArns",
    "Value": "$CERT_ARN"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:default",
    "OptionName": "Port",
    "Value": "8080"
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
  }
]
EOF

echo "🌐 Creating new environment with Application Load Balancer and HTTPS..."
aws elasticbeanstalk create-environment \
    --application-name "$APP_NAME" \
    --environment-name "$NEW_ENV_NAME" \
    --solution-stack-name "64bit Amazon Linux 2023 v4.5.2 running Docker" \
    --version-label "$VERSION_LABEL" \
    --option-settings file://alb-https-config.json \
    --region "$REGION"

echo "⏳ Waiting for environment to be ready (10-15 minutes)..."
aws elasticbeanstalk wait environment-ready \
    --environment-name "$NEW_ENV_NAME" \
    --region "$REGION"

# Get environment URL
ENV_URL=$(aws elasticbeanstalk describe-environments \
    --environment-names "$NEW_ENV_NAME" \
    --region "$REGION" \
    --query 'Environments[0].CNAME' \
    --output text)

echo ""
echo "🎉 HTTPS Environment Created Successfully!"
echo "========================================"
echo "Environment: $NEW_ENV_NAME"
echo "HTTP URL: http://$ENV_URL"
echo "HTTPS URL: https://$ENV_URL"
echo ""

# Test endpoints
echo "🔍 Testing endpoints..."
if curl -s --max-time 10 "http://$ENV_URL/health/" > /dev/null; then
    echo "✅ HTTP endpoint working"
else
    echo "❌ HTTP endpoint failed"
fi

if curl -s --max-time 10 -k "https://$ENV_URL/health/" > /dev/null; then
    echo "✅ HTTPS endpoint working"
    echo "🎉 Success! New backend supports HTTPS"
else
    echo "❌ HTTPS endpoint failed"
fi

# Cleanup
rm -f alb-https-config.json

echo ""
echo "📝 Next Steps:"
echo "1. Test HTTPS: curl https://$ENV_URL/health/"
echo "2. Update frontend .env.production with: https://$ENV_URL"
echo "3. Terminate old environment: Dott-env-fixed (after testing)" 