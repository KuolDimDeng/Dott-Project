#!/bin/bash

echo "🔍 Testing Vercel → API Connection"
echo "=================================="

echo "1. Testing DNS resolution:"
dig api.dottapps.com +short

echo -e "\n2. Testing CloudFront status:"
aws cloudfront get-distribution --id E1NYAUSVFSRF1D --query 'Distribution.Status' --output text

echo -e "\n3. Testing HTTPS health endpoint:"
curl -I https://api.dottapps.com/health/ --max-time 15

echo -e "\n4. Testing full API response:"
curl https://api.dottapps.com/health/ --max-time 15

echo -e "\n5. Testing CORS headers (important for Vercel):"
curl -H "Origin: https://dottapps.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Authorization,Content-Type" \
     -X OPTIONS \
     https://api.dottapps.com/health/ \
     -v --max-time 15

echo -e "\n✅ If all tests pass, your Vercel frontend should connect successfully!"
echo "🌐 Your API is available at: https://api.dottapps.com"
echo "🚀 Your frontend is at: https://dottapps.com" 