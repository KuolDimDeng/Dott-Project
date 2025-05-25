#!/bin/bash

# Long-term HTTPS Solution: CloudFront + Route 53
# This creates a professional, scalable HTTPS setup

set -e

echo "🚀 Setting up CloudFront HTTPS Solution (Long-term)"
echo "=================================================="

# Configuration
BACKEND_DOMAIN="dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com"
CERT_ARN="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"
REGION="us-east-1"

echo "📋 Configuration:"
echo "Backend: $BACKEND_DOMAIN"
echo "Certificate: $CERT_ARN"
echo "Target Domain: api.dottapps.com"
echo ""

# Create CloudFront distribution configuration
cat > cloudfront-config.json << EOF
{
  "CallerReference": "dott-api-$(date +%s)",
  "Comment": "HTTPS API for DottApps",
  "DefaultRootObject": "",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "dott-backend",
        "DomainName": "$BACKEND_DOMAIN",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "dott-backend",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {
        "Forward": "all"
      },
      "Headers": {
        "Quantity": 4,
        "Items": ["Authorization", "Content-Type", "Origin", "Accept"]
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 0,
    "MaxTTL": 0
  },
  "Enabled": true,
  "Aliases": {
    "Quantity": 1,
    "Items": ["api.dottapps.com"]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "$CERT_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "PriceClass": "PriceClass_100"
}
EOF

echo "🌐 Creating CloudFront distribution..."
DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --region us-east-1 \
  --query 'Distribution.Id' \
  --output text)

echo "✅ CloudFront distribution created: $DISTRIBUTION_ID"

# Get the CloudFront domain name
CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id "$DISTRIBUTION_ID" \
  --region us-east-1 \
  --query 'Distribution.DomainName' \
  --output text)

echo "📡 CloudFront domain: $CLOUDFRONT_DOMAIN"
echo ""

echo "⏳ CloudFront is deploying (this takes 10-20 minutes)..."
echo ""

# Get the Route 53 hosted zone ID for dottapps.com
echo "🔍 Finding Route 53 hosted zone for dottapps.com..."
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query 'HostedZones[?Name==`dottapps.com.`].Id' \
  --output text | cut -d'/' -f3)

if [ -z "$HOSTED_ZONE_ID" ]; then
  echo "❌ No hosted zone found for dottapps.com"
  echo "📝 Manual setup required - see instructions below"
else
  echo "✅ Found hosted zone: $HOSTED_ZONE_ID"
  
  # Create Route 53 record for api.dottapps.com
  cat > route53-record.json << EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.dottapps.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "$CLOUDFRONT_DOMAIN"
          }
        ]
      }
    }
  ]
}
EOF

  echo "🔗 Creating DNS record for api.dottapps.com..."
  aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch file://route53-record.json
  
  echo "✅ DNS record created!"
fi

# Cleanup
rm -f cloudfront-config.json route53-record.json

echo ""
echo "🎉 HTTPS Setup Complete!"
echo "======================="
echo ""
echo "📊 Status:"
echo "• CloudFront Distribution: $DISTRIBUTION_ID"
echo "• CloudFront Domain: $CLOUDFRONT_DOMAIN"
echo "• API Domain: api.dottapps.com"
echo "• Backend: $BACKEND_DOMAIN (HTTP)"
echo ""
echo "⏳ Next Steps:"
echo "1. Wait 10-20 minutes for CloudFront deployment"
echo "2. Test: curl https://api.dottapps.com/health/"
echo "3. Update frontend to use: https://api.dottapps.com"
echo ""
echo "🔍 Monitor deployment:"
echo "aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.Status'"
echo ""
echo "✅ This is now a production-ready HTTPS API setup!" 