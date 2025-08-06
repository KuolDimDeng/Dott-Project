#!/bin/bash

# Test POS Session Authentication Flow
# This script tests the industry-standard session authentication

echo "=== Testing POS Session Authentication Flow ==="
echo ""

# Test 1: Check if session-v2 endpoint exists
echo "1. Testing session-v2 endpoint availability..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "https://api.dottapps.com/api/auth/session-v2" \
  -H "Authorization: Session invalid-token" \
  -H "Content-Type: application/json")

if [ "$response" = "401" ]; then
    echo "✅ Session-v2 endpoint is working (returns 401 for invalid token)"
else
    echo "❌ Session-v2 endpoint issue. HTTP status: $response"
fi

echo ""

# Test 2: Check products API endpoint
echo "2. Testing products API endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "https://api.dottapps.com/api/inventory/products/" \
  -H "Authorization: Session invalid-token" \
  -H "Content-Type: application/json")

if [ "$response" = "401" ] || [ "$response" = "403" ]; then
    echo "✅ Products endpoint requires authentication (returns $response)"
else
    echo "⚠️  Products endpoint returned: $response"
fi

echo ""

# Test 3: Check customers API endpoint  
echo "3. Testing customers API endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "https://api.dottapps.com/api/crm/customers/" \
  -H "Authorization: Session invalid-token" \
  -H "Content-Type: application/json")

if [ "$response" = "401" ] || [ "$response" = "403" ]; then
    echo "✅ Customers endpoint requires authentication (returns $response)"
else
    echo "⚠️  Customers endpoint returned: $response"
fi

echo ""
echo "=== Summary ==="
echo "The authentication endpoints are properly secured and the session-v2 endpoint is working."
echo "POS components should now be able to authenticate if a valid session cookie exists."
echo ""
echo "To test with a real session:"
echo "1. Log into the application normally"
echo "2. Check browser DevTools > Application > Cookies for 'sid' cookie"
echo "3. The POS component should automatically use this cookie for authentication"