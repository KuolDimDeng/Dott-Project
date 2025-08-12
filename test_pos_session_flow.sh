#!/bin/bash
# Test POS session flow to debug authentication issues

echo "========================================"
echo "Testing POS Session Flow"
echo "========================================"

# First, let's try to login and get a real session
echo -e "\n1. Logging in to get session..."
LOGIN_RESPONSE=$(curl -s -X POST https://app.dottapps.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "support@dottapps.com", "password": "EYZ2WKy2-#6d"}' \
  -c cookies.txt \
  -v 2>&1)

echo "Login response (partial):"
echo "$LOGIN_RESPONSE" | grep -E "Set-Cookie|sid|session" | head -10

# Check what cookies we got
echo -e "\n2. Cookies received:"
cat cookies.txt | grep -E "sid|session"

# Extract the sid cookie value
SID=$(grep "sid" cookies.txt | awk '{print $7}')
echo -e "\nSession ID: $SID"

if [ -z "$SID" ]; then
    echo "❌ No session ID found. Trying alternative login endpoint..."
    
    # Try the browser-based signin
    curl -s -X POST https://app.dottapps.com/api/auth/browser-signin \
      -H "Content-Type: application/json" \
      -d '{"email": "support@dottapps.com", "password": "EYZ2WKy2-#6d"}' \
      -c cookies2.txt \
      -v 2>&1 | grep -E "Set-Cookie|sid|session" | head -10
    
    cat cookies2.txt | grep -E "sid|session"
    SID=$(grep "sid" cookies2.txt | awk '{print $7}')
    
    if [ -z "$SID" ]; then
        echo "❌ Still no session ID. Authentication might be broken."
        exit 1
    fi
    mv cookies2.txt cookies.txt
fi

echo -e "\n3. Testing frontend API endpoints with session cookie..."

echo -e "\n   a. Testing /api/products:"
curl -s https://app.dottapps.com/api/products \
  -b cookies.txt \
  -H "Content-Type: application/json" | jq '.' | head -20

echo -e "\n   b. Testing /api/backend/crm/customers:"
curl -s https://app.dottapps.com/api/backend/crm/customers \
  -b cookies.txt \
  -H "Content-Type: application/json" | jq '.' | head -20

echo -e "\n   c. Testing /api/settings/taxes:"
curl -s https://app.dottapps.com/api/settings/taxes \
  -b cookies.txt \
  -H "Content-Type: application/json" | jq '.' | head -20

echo -e "\n   d. Testing /api/users/me:"
curl -s https://app.dottapps.com/api/users/me \
  -b cookies.txt \
  -H "Content-Type: application/json" | jq '.' | head -20

# Clean up
rm -f cookies.txt cookies2.txt

echo -e "\n========================================"
echo "Test Complete"
echo "========================================"