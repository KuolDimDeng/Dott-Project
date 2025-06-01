#!/bin/bash

echo "🔍 Testing API connection to api.dottapps.com..."
echo ""

# Test health endpoint
echo "1. Testing /health/ endpoint:"
curl -v -H "Accept: application/json" https://api.dottapps.com/health/ 2>&1 | head -20

echo ""
echo "2. Testing with different User-Agent:"
curl -H "User-Agent: Test/1.0" -H "Accept: application/json" https://api.dottapps.com/health/ 2>&1 | head -10

echo ""
echo "3. Testing SSL certificate:"
openssl s_client -connect api.dottapps.com:443 -servername api.dottapps.com < /dev/null 2>/dev/null | openssl x509 -noout -subject -dates

echo ""
echo "4. DNS Resolution:"
nslookup api.dottapps.com

echo ""
echo "✅ Test completed!" 