#!/bin/bash
# Test POS API endpoints to debug data fetching issues

echo "========================================"
echo "Testing POS API Endpoints"
echo "========================================"

# Get session cookie for authentication
echo -e "\n1. Getting session..."
SESSION_RESPONSE=$(curl -s -X POST https://api.dottapps.com/api/auth/password-login \
  -H "Content-Type: application/json" \
  -d '{"email": "support@dottapps.com", "password": "EYZ2WKy2-#6d"}' \
  -c cookies.txt)

echo "Session Response: $SESSION_RESPONSE"

# Extract session ID from cookies
SID=$(grep "sid" cookies.txt | awk '{print $7}')
echo "Session ID: $SID"

echo -e "\n2. Testing /api/inventory/products/ endpoint..."
curl -s -X GET https://api.dottapps.com/api/inventory/products/ \
  -H "Authorization: Session $SID" \
  -H "Content-Type: application/json" | jq '.' | head -20

echo -e "\n3. Testing /api/crm/customers/ endpoint..."
curl -s -X GET https://api.dottapps.com/api/crm/customers/ \
  -H "Authorization: Session $SID" \
  -H "Content-Type: application/json" | jq '.' | head -20

echo -e "\n4. Testing frontend proxy /api/products endpoint..."
curl -s -X GET https://app.dottapps.com/api/products \
  -b cookies.txt \
  -H "Content-Type: application/json" | jq '.' | head -20

echo -e "\n5. Testing frontend proxy /api/backend/crm/customers endpoint..."
curl -s -X GET https://app.dottapps.com/api/backend/crm/customers \
  -b cookies.txt \
  -H "Content-Type: application/json" | jq '.' | head -20

# Clean up
rm -f cookies.txt

echo -e "\n========================================"
echo "Test Complete"
echo "========================================"