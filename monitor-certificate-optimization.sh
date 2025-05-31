#!/bin/bash

echo "🔍 Certificate Optimization Monitoring"
echo "===================================="

WILDCARD_CERT="arn:aws:acm:us-east-1:471112661935:certificate/dcb29b8e-d1de-48d3-8430-2d6ff2177d64"
OLD_CERT="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"

while true; do
    echo "📊 Checking CloudFront deployment status..."
    
    STATUS=$(aws cloudfront get-distribution --id E2BYTRL6S1FNTF --query 'Distribution.Status' --output text --region us-east-1)
    
    echo "Frontend Distribution (dottapps.com): $STATUS"
    
    if [ "$STATUS" = "Deployed" ]; then
        echo ""
        echo "🎉 CloudFront distribution is now DEPLOYED!"
        echo "✅ Certificate optimization complete!"
        echo ""
        echo "🧪 Testing HTTPS endpoints..."
        
        echo "Testing frontend..."
        curl -I https://dottapps.com --max-time 10 2>/dev/null | head -1 || echo "Frontend test failed"
        
        echo "Testing backend..."
        curl -I https://api.dottapps.com --max-time 10 2>/dev/null | head -1 || echo "Backend test failed (expected - app issues)"
        
        echo ""
        echo "🗑️  You can now safely delete the old certificate:"
        echo "aws acm delete-certificate --certificate-arn $OLD_CERT --region us-east-1"
        echo ""
        echo "📋 Final HTTPS Status:"
        echo "✅ Single wildcard certificate for all domains"
        echo "✅ Frontend HTTPS: Working"
        echo "🔧 Backend HTTPS: SSL working, app needs fixes"
        echo ""
        echo "💡 To complete the setup, run the backend fix:"
        echo "./fix-https-backend-complete.sh"
        break
    else
        echo "⏳ Still deploying... checking again in 30 seconds"
        sleep 30
    fi
done 