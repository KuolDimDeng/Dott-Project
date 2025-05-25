#!/bin/bash

# Global HTTPS Solution: CloudFront (Fixed Certificate Issue)
# Uses existing certificate domains: dottapps.com

set -e

echo "🌍 Setting up CloudFront for Global Traffic (Certificate Fixed)"
echo "=============================================================="

# Configuration
BACKEND_DOMAIN="dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com"
CERT_ARN="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"
REGION="us-east-1"

echo "📋 Configuration:"
echo "Backend: $BACKEND_DOMAIN"
echo "Certificate: $CERT_ARN"
echo "API Domain: dottapps.com/api (uses existing certificate)"
echo ""

echo "🌍 Why CloudFront for Global Traffic:"
echo "• 400+ edge locations worldwide"
echo "• 5-10x faster for international users"
echo "• 50% lower costs for global data transfer"
echo "• Professional CDN infrastructure"
echo ""

# Create CloudFront distribution configuration
cat > cloudfront-global-config.json << EOF
{
  "CallerReference": "dott-api-global-$(date +%s)",
  "Comment": "Global HTTPS API for DottApps",
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
  "CacheBehaviors": {
    "Quantity": 1,
    "Items": [
      {
        "PathPattern": "/api/*",
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
            "Quantity": 6,
            "Items": ["Authorization", "Content-Type", "Origin", "Accept", "User-Agent", "Referer"]
          }
        },
        "MinTTL": 0,
        "DefaultTTL": 0,
        "MaxTTL": 0
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
        "Quantity": 6,
        "Items": ["Authorization", "Content-Type", "Origin", "Accept", "User-Agent", "Referer"]
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 0,
    "MaxTTL": 0
  },
  "Enabled": true,
  "Aliases": {
    "Quantity": 1,
    "Items": ["dottapps.com"]
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
  --distribution-config file://cloudfront-global-config.json \
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

echo "⏳ CloudFront is deploying globally (10-20 minutes)..."
echo ""

# Setup DNS to point dottapps.com to CloudFront
echo "🌐 Setting up DNS for dottapps.com..."
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query 'HostedZones[?Name==`dottapps.com.`].Id' \
  --output text | cut -d'/' -f3)

if [ -n "$HOSTED_ZONE_ID" ]; then
  # Create Route 53 record for apex domain
  cat > route53-apex-record.json << EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "dottapps.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "$CLOUDFRONT_DOMAIN",
          "EvaluateTargetHealth": false,
          "HostedZoneId": "Z2FDTNDATAQYW2"
        }
      }
    }
  ]
}
EOF

  echo "🔗 Creating DNS record for dottapps.com..."
  aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch file://route53-apex-record.json
  
  rm -f route53-apex-record.json
  echo "✅ DNS record created!"
else
  echo "📝 Manual DNS setup required:"
  echo "Create A record (alias): dottapps.com → $CLOUDFRONT_DOMAIN"
fi

# Cleanup
rm -f cloudfront-global-config.json

echo ""
echo "🎉 Global HTTPS API Setup Complete!"
echo "=================================="
echo ""
echo "📊 Your Global Setup:"
echo "• CloudFront Distribution: $DISTRIBUTION_ID"
echo "• CloudFront Domain: $CLOUDFRONT_DOMAIN"
echo "• API URLs:"
echo "  - https://dottapps.com/api/health/"
echo "  - https://dottapps.com/api/auth/"
echo "  - https://dottapps.com/api/*"
echo "• Backend: $BACKEND_DOMAIN (HTTP)"
echo "• Global Edge Locations: 400+"
echo ""
echo "💰 Cost for Global Traffic:"
echo "• $0.0075 per 10K requests"
echo "• $0.085/GB data transfer (first 10TB)"
echo "• ~50% savings vs ALB for international users"
echo ""
echo "⏳ Deployment Status:"
echo "1. Wait 10-20 minutes for global deployment"
echo "2. Test: curl https://dottapps.com/api/health/"
echo "3. Update frontend to use: https://dottapps.com/api"
echo ""
echo "🔍 Monitor deployment:"
echo "aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.Status'"
echo ""
echo "✅ Your API is now globally distributed with HTTPS!" 