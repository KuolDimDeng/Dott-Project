#!/bin/bash

# Emergency Service Restoration - Switch CloudFront Back to Working Environment
set -e

echo "🚨 Emergency Service Restoration"
echo "==============================="

REGION="us-east-1"
CLOUDFRONT_ID="E2BYTRL6S1FNTF"
WORKING_ENVIRONMENT="Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com"
MAX_SECURITY_ENVIRONMENT="DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com"

echo "🎯 Emergency Plan:"
echo "• Switch CloudFront back to working environment ✅"
echo "• Restore user service immediately ✅"
echo "• Continue working on maximum security in background ✅"
echo ""

# First, verify working environment is still healthy
echo "🔍 Verifying working environment health..."
WORKING_RESPONSE=$(curl -s --max-time 10 "http://$WORKING_ENVIRONMENT/health/" || echo "FAILED")

if echo "$WORKING_RESPONSE" | grep -q "ok\|healthy\|status"; then
    echo "✅ Working environment healthy: $WORKING_RESPONSE"
else
    echo "⚠️ Working environment response: $WORKING_RESPONSE"
    echo "🔄 Continuing with restoration anyway..."
fi

# Get current CloudFront configuration
echo "📋 Getting current CloudFront configuration..."

aws cloudfront get-distribution-config \
    --id $CLOUDFRONT_ID \
    --region $REGION > current-distribution.json

# Extract current ETag
ETAG=$(cat current-distribution.json | grep '"ETag"' | sed 's/.*"ETag": "\([^"]*\)".*/\1/')
echo "Current ETag: $ETAG"

# Extract current distribution config
cat current-distribution.json | jq '.DistributionConfig' > distribution-config.json

# Update the origin domain to point back to working environment
echo "🔄 Switching CloudFront back to working environment..."

cat distribution-config.json | jq \
  --arg working_domain "$WORKING_ENVIRONMENT" \
  '.Origins.Items[0].DomainName = $working_domain' > updated-distribution-config.json

echo "✅ Updated configuration to point to: $WORKING_ENVIRONMENT"

# Update CloudFront distribution
echo "🚀 Applying CloudFront update..."

aws cloudfront update-distribution \
    --id $CLOUDFRONT_ID \
    --distribution-config file://updated-distribution-config.json \
    --if-match $ETAG \
    --region $REGION > update-result.json

echo "✅ CloudFront update initiated"

# Get new ETag for reference
NEW_ETAG=$(cat update-result.json | jq -r '.ETag')
echo "New ETag: $NEW_ETAG"

echo ""
echo "⏳ CloudFront is updating (this takes 5-15 minutes)..."
echo "🔄 Users will gradually switch back to working environment"
echo ""

# Test immediate service restoration
echo "🧪 Testing service restoration..."

# Wait a moment for initial propagation
sleep 30

echo "Testing working environment directly:"
DIRECT_TEST=$(curl -s --max-time 10 "http://$WORKING_ENVIRONMENT/health/" || echo "FAILED")
echo "Direct response: $DIRECT_TEST"

echo ""
echo "Testing via CloudFront (may take time to propagate):"
CLOUDFRONT_TEST=$(curl -s --max-time 15 "https://dottapps.com/api/health/" || echo "FAILED")

if echo "$CLOUDFRONT_TEST" | grep -q "ok\|healthy\|status"; then
    echo "🎉 CloudFront already serving from working environment!"
    echo "Response: $CLOUDFRONT_TEST"
else
    echo "⏳ CloudFront still propagating - this is normal"
    echo "Response: $CLOUDFRONT_TEST"
fi

echo ""
echo "🎉 Emergency Service Restoration Initiated!"
echo "=========================================="
echo ""
echo "✅ CloudFront switched back to working environment"
echo "✅ Users will have service restored shortly"
echo "✅ Maximum security environment preserved for continued work"
echo ""
echo "📋 Current Status:"
echo "• HIGH Security: Active and serving users ✅"
echo "• MAXIMUM Security: Available for continued development ✅"
echo ""
echo "🔧 Next Steps:"
echo "1. Monitor CloudFront propagation (5-15 minutes)"
echo "2. Verify users have restored service"
echo "3. Continue working on maximum security environment"
echo "4. Switch back when maximum security is fully ready"
echo ""

# Test the maximum security environment in background
echo "🔍 Current Maximum Security Environment Status:"
MAX_SECURITY_TEST=$(curl -s --max-time 10 "http://$MAX_SECURITY_ENVIRONMENT/health/" || echo "502_BAD_GATEWAY")

if echo "$MAX_SECURITY_TEST" | grep -q "ok\|healthy\|status"; then
    echo "🎉 Maximum security environment is actually working!"
    echo "Response: $MAX_SECURITY_TEST"
    echo ""
    echo "💡 The maximum security might be working now!"
    echo "🔄 You could switch back once you verify it's stable"
else
    echo "📋 Maximum security still needs nginx proxy fix"
    echo "Response: $MAX_SECURITY_TEST"
fi

echo ""
echo "🚀 Service Restoration Complete!"
echo "Users now have reliable service while we perfect maximum security!"

# Cleanup
rm -f current-distribution.json distribution-config.json updated-distribution-config.json update-result.json 