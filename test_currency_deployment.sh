#!/bin/bash

echo "🔍 Testing Currency API Deployment Status"
echo "========================================"
echo ""

# Test the health endpoint (should exist if v3 is deployed)
echo "1. Testing health endpoint (v3 only):"
echo "   URL: https://api.dottapps.com/api/currency/health/"
curl -s -w "\n   HTTP Status: %{http_code}\n" https://api.dottapps.com/api/currency/health/ | head -n 5
echo ""

# Test with a test session to see detailed error
echo "2. Testing preferences endpoint with detailed error logging:"
echo "   Creating test request..."

# Create a Python script to test with session
cat > /tmp/test_currency_api.py << 'EOF'
import requests
import json

# Test the currency preferences API
url = "https://api.dottapps.com/api/currency/preferences"

# Use a test session ID (this will fail auth but show us if v3 is running)
headers = {
    "Cookie": "sid=test-session-id",
    "Content-Type": "application/json"
}

print("Sending request to:", url)
response = requests.get(url, headers=headers)

print(f"Status Code: {response.status_code}")
print(f"Response Headers: {dict(response.headers)}")
print(f"Response Body:")
try:
    print(json.dumps(response.json(), indent=2))
except:
    print(response.text[:500])
EOF

python3 /tmp/test_currency_api.py
echo ""

echo "3. Checking backend logs for v3 markers:"
echo "   If v3 is deployed, we should see [Currency V3] log entries"
echo ""

echo "📊 Summary:"
echo "   - If health endpoint returns 200 or auth error: v3 is deployed ✅"
echo "   - If health endpoint returns 404: v3 is NOT deployed ❌"
echo "   - Check logs at: https://dashboard.render.com/web/srv-ct1h7jlu0jms73f81jng/logs"