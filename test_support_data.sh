#!/bin/bash

# Test what data exists for support@dottapps.com

echo "Testing support@dottapps.com data access..."
echo "==========================================="

# First login to get session
echo -e "\n1. Logging in as support@dottapps.com..."
LOGIN_RESPONSE=$(curl -s -X POST https://api.dottapps.com/api/auth/password-login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"support@dottapps.com","password":"Dimpapieu@1979"}')

# Extract session_id
SESSION_ID=$(echo $LOGIN_RESPONSE | grep -o '"session_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in successfully"
echo "   Session ID: $SESSION_ID"

# Test various endpoints
echo -e "\n2. Checking Products..."
curl -s -X GET https://api.dottapps.com/api/products/ \
  -H "Cookie: sid=$SESSION_ID" | python3 -m json.tool | head -20

echo -e "\n3. Checking Services..."
curl -s -X GET https://api.dottapps.com/api/services/ \
  -H "Cookie: sid=$SESSION_ID" | python3 -m json.tool | head -20

echo -e "\n4. Checking Customers..."
curl -s -X GET https://api.dottapps.com/api/crm/customers/ \
  -H "Cookie: sid=$SESSION_ID" | python3 -m json.tool | head -20

echo -e "\n5. Checking Invoices..."
curl -s -X GET https://api.dottapps.com/api/invoices/ \
  -H "Cookie: sid=$SESSION_ID" | python3 -m json.tool | head -20

echo -e "\n6. Checking current session details..."
curl -s -X GET https://api.dottapps.com/api/sessions/current/ \
  -H "Cookie: sid=$SESSION_ID" | python3 -m json.tool

echo -e "\nDone!"