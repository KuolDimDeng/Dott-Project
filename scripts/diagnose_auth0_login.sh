#!/bin/bash

echo "=========================================="
echo "Auth0 Login Diagnostic Script"
echo "=========================================="
echo ""

# Configuration from .env file
AUTH0_DOMAIN="dev-cbyy63jovi6zrcos.us.auth0.com"
AUTH0_CLIENT_ID="9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF"
AUTH0_CLIENT_SECRET="IqdjbqNX47Uk7gBOhBFWLQG-ndZ47xI6rNruwpf4jF--5fhZPEMU0INz5ZWTw1qX"
AUTH0_AUDIENCE="https://api.dottapps.com"
EMAIL="support@dottapps.com"

echo "Testing Auth0 Password Grant directly..."
echo "----------------------------------------"
echo "Domain: $AUTH0_DOMAIN"
echo "Client ID: $AUTH0_CLIENT_ID"
echo "Audience: $AUTH0_AUDIENCE"
echo "Email: $EMAIL"
echo ""

echo "Enter password for $EMAIL:"
read -s PASSWORD
echo ""

echo "Testing authentication..."
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

# Check if we got an access token
if echo "$RESPONSE" | grep -q "access_token"; then
  echo "✅ SUCCESS! Authentication worked!"
  echo ""
  echo "This means:"
  echo "1. Your credentials are correct"
  echo "2. Auth0 Password Grant is enabled"
  echo "3. The Auth0 configuration is correct"
  echo ""
  echo "The issue is likely in the frontend or backend configuration."
  echo ""
  
  # Extract access token
  ACCESS_TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")
  
  # Test userinfo endpoint
  echo "Testing userinfo endpoint..."
  USERINFO=$(curl -s -X GET "https://$AUTH0_DOMAIN/userinfo" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  echo "User info:"
  echo "$USERINFO" | python3 -m json.tool
  
else
  echo "❌ FAILED! Authentication failed"
  echo ""
  echo "Error response:"
  echo "$RESPONSE" | python3 -m json.tool
  echo ""
  
  # Parse error
  ERROR=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('error', ''))")
  ERROR_DESC=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('error_description', ''))")
  
  echo "Diagnosis:"
  echo "----------"
  
  if [[ "$ERROR" == "access_denied" ]]; then
    if [[ "$ERROR_DESC" == *"Wrong email or password"* ]]; then
      echo "❌ Invalid credentials - the password is incorrect"
      echo ""
      echo "Solutions:"
      echo "1. Reset password at: https://dottapps.com/auth/forgot-password"
      echo "2. Or reset in Auth0 Dashboard > User Management > Users"
    elif [[ "$ERROR_DESC" == *"Grant type"* ]] || [[ "$ERROR_DESC" == *"unauthorized_client"* ]]; then
      echo "❌ Password Grant is NOT enabled!"
      echo ""
      echo "To fix:"
      echo "1. Go to: https://manage.auth0.com"
      echo "2. Navigate to: Applications > Dott (or your app name)"
      echo "3. Go to Settings tab"
      echo "4. Scroll to bottom > Advanced Settings"
      echo "5. Click 'Grant Types' tab"
      echo "6. Check the 'Password' checkbox"
      echo "7. Save changes"
    fi
  elif [[ "$ERROR" == "unauthorized_client" ]]; then
    echo "❌ Password Grant is not enabled for this application"
    echo ""
    echo "Enable it in Auth0 Dashboard > Applications > Settings > Advanced > Grant Types"
  fi
fi

echo ""
echo "=========================================="
echo "Additional Checks"
echo "=========================================="
echo ""
echo "1. Check Render environment variables:"
echo "   render secrets"
echo ""
echo "2. Check if Auth0 Domain is correctly set in Render:"
echo "   Should be: dev-cbyy63jovi6zrcos.us.auth0.com"
echo "   NOT: auth.dottapps.com (that's the custom domain)"
echo ""
echo "3. Check backend logs for actual error:"
echo "   render logs dott-api --tail"
echo ""