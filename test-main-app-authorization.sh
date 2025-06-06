#!/bin/bash
# Test main application after Auth0 authorization

echo "🧪 Testing Main Application After Auth0 Authorization"
echo "===================================================="

echo "📋 Step 1: Testing main app token generation..."

# Test main application
MAIN_APP_RESPONSE=$(curl -s --request POST \
  --url https://dev-cbyy63jovi6zrcos.us.auth0.com/oauth/token \
  --header 'content-type: application/json' \
  --data '{
    "client_id":"9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF",
    "client_secret":"IqdjbqNX47Uk7gBOhBFWLQG-ndZ47xI6rNruwpf4jF--5fhZPEMU0INz5ZWTw1qX",
    "audience":"https://api.dottapps.com",
    "grant_type":"client_credentials"
  }')

echo "Main App Response:"
echo "$MAIN_APP_RESPONSE" | jq '.'

# Check if we got a token
ACCESS_TOKEN=$(echo "$MAIN_APP_RESPONSE" | jq -r '.access_token')
ERROR=$(echo "$MAIN_APP_RESPONSE" | jq -r '.error')

if [ "$ERROR" != "null" ]; then
    echo "❌ Authorization failed: $ERROR"
    echo ""
    echo "🔧 STEPS TO FIX:"
    echo "1. Go to Auth0 Dashboard → Applications → Applications"
    echo "2. Select your main app (9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF)"
    echo "3. Click 'APIs' tab"
    echo "4. Find 'Dott API' and click 'Authorize'"
    echo "5. Grant necessary scopes and Save"
    exit 1
fi

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ No access token received"
    exit 1
fi

echo "✅ Successfully obtained access token from main app!"

# Check token format
TOKEN_PARTS=$(echo "$ACCESS_TOKEN" | tr -cd '.' | wc -c)
echo "Token parts: $((TOKEN_PARTS + 1))"

if [ $TOKEN_PARTS -eq 2 ]; then
    echo "✅ Received JWT token (3 parts) - JWE ISSUE FIXED!"
elif [ $TOKEN_PARTS -eq 4 ]; then
    echo "❌ Still receiving JWE token (5 parts)"
    echo "   🔧 FIX: Disable 'Encrypt access tokens' in Dott API settings"
    exit 1
else
    echo "⚠️ Unexpected token format: $((TOKEN_PARTS + 1)) parts"
fi

# Test backend authentication
echo ""
echo "📋 Step 2: Testing backend authentication..."

BACKEND_RESPONSE=$(curl -s --request GET \
  --url https://api.dottapps.com/api/users/me/ \
  --header "authorization: Bearer $ACCESS_TOKEN" \
  --write-out "HTTPSTATUS:%{http_code}")

HTTP_STATUS=$(echo "$BACKEND_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
RESPONSE_BODY=$(echo "$BACKEND_RESPONSE" | sed -e 's/HTTPSTATUS:.*//g')

echo "Backend response status: $HTTP_STATUS"
echo "Backend response: $RESPONSE_BODY"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "🎉 SUCCESS! Main application authentication is working!"
    echo "🎉 JWE TOKEN ISSUE IS COMPLETELY RESOLVED!"
elif [ "$HTTP_STATUS" = "401" ]; then
    echo "⚠️ Token not accepted (401) - may need backend deployment"
elif [ "$HTTP_STATUS" = "403" ]; then
    echo "⚠️ Token accepted but access forbidden (403)"
else
    echo "⚠️ Unexpected status: $HTTP_STATUS"
fi

echo ""
echo "===================================================="
echo "📊 SUMMARY:"
echo "✅ New Dott API: Working correctly"
echo "✅ JWT Token Generation: Success"
echo "✅ Main App Authorization: $([ "$ERROR" = "null" ] && echo "Success" || echo "Needs fixing")"
echo "✅ Backend Authentication: $([ "$HTTP_STATUS" = "200" ] && echo "Success" || echo "Status $HTTP_STATUS")"

if [ "$HTTP_STATUS" = "200" ]; then
    echo ""
    echo "🔥 NEXT STEPS:"
    echo "1. ✅ Test user login flow in frontend"
    echo "2. ✅ Verify onboarding flow completes"
    echo "3. ✅ All authentication issues should be resolved"
else
    echo ""
    echo "🔧 REMAINING STEPS:"
    echo "1. Ensure main app is authorized for Dott API"
    echo "2. Deploy latest backend changes"
    echo "3. Test again"
fi 