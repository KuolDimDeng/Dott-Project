#!/bin/bash

echo "=========================================="
echo "Auth0 Deployment Verification Script"
echo "=========================================="
echo ""

# Test if the backend is using the correct Auth0 domain
echo "1. Testing backend Auth0 configuration..."
echo "----------------------------------------"

# Make a test request to see what domain is being used
echo "Checking backend health..."
HEALTH_RESPONSE=$(curl -s https://api.dottapps.com/health/)
echo "Backend health: $HEALTH_RESPONSE"
echo ""

# Check the actual Auth0 authentication
echo "2. Testing Auth0 authentication directly..."
echo "----------------------------------------"

AUTH0_DOMAIN="dev-cbyy63jovi6zrcos.us.auth0.com"
AUTH0_CLIENT_ID="9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF"
AUTH0_CLIENT_SECRET="IqdjbqNX47Uk7gBOhBFWLQG-ndZ47xI6rNruwpf4jF--5fhZPEMU0INz5ZWTw1qX"
AUTH0_AUDIENCE="https://api.dottapps.com"

echo "Enter email (or press Enter for support@dottapps.com):"
read EMAIL
if [ -z "$EMAIL" ]; then
    EMAIL="support@dottapps.com"
fi

echo "Enter password:"
read -s PASSWORD
echo ""

echo "Testing with correct Auth0 domain: $AUTH0_DOMAIN"
RESPONSE=$(curl -s -X POST "https://$AUTH0_DOMAIN/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"password\",
    \"username\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"client_id\": \"$AUTH0_CLIENT_ID\",
    \"client_secret\": \"$AUTH0_CLIENT_SECRET\",
    \"audience\": \"$AUTH0_AUDIENCE\",
    \"scope\": \"openid profile email\"
  }")

if echo "$RESPONSE" | grep -q "access_token"; then
    echo "✅ SUCCESS! Direct Auth0 authentication works!"
    echo ""
    echo "This confirms:"
    echo "- Your credentials are correct"
    echo "- Auth0 is properly configured"
    echo "- Password Grant is enabled"
    echo ""
    echo "The issue is that the backend hasn't deployed the fix yet."
    echo ""
    
    # Extract access token for further testing
    ACCESS_TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")
    
    # Test backend password-login endpoint
    echo "3. Testing backend password-login endpoint..."
    echo "----------------------------------------"
    
    BACKEND_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "https://api.dottapps.com/api/auth/password-login/" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$EMAIL\",
        \"password\": \"$PASSWORD\"
      }")
    
    HTTP_STATUS=$(echo "$BACKEND_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    BODY=$(echo "$BACKEND_RESPONSE" | sed '/HTTP_STATUS/d')
    
    echo "Backend response status: $HTTP_STATUS"
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✅ Backend authentication successful!"
        echo "The deployment has completed and login should work now."
    else
        echo "❌ Backend still returning error status: $HTTP_STATUS"
        echo "Response: $BODY"
        echo ""
        echo "The backend deployment hasn't completed yet."
        echo "Please wait a few more minutes and try again."
    fi
else
    echo "❌ Direct Auth0 authentication failed"
    echo "Response: $RESPONSE"
    echo ""
    ERROR=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('error_description', data.get('error', 'Unknown error')))" 2>/dev/null || echo "Could not parse error")
    echo "Error: $ERROR"
fi

echo ""
echo "=========================================="
echo "Deployment Status Check"
echo "=========================================="
echo ""
echo "To check Render deployment status:"
echo "1. Go to https://dashboard.render.com"
echo "2. Check 'dott-api' service"
echo "3. Look for 'Deploy live' status"
echo ""
echo "The deployment should show commit: 569e5fd51"
echo "Message: 'CRITICAL: Fix AUTH0_DOMAIN in backend settings'"
echo ""
echo "Once deployed, authentication will work because:"
echo "- Backend will use dev-cbyy63jovi6zrcos.us.auth0.com"
echo "- Not the custom domain auth.dottapps.com"
echo "- Password grant works on the actual Auth0 domain"
echo ""