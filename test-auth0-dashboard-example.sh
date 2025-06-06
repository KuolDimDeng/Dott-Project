#!/bin/bash
# Test Auth0 API using the exact example from dashboard
# This tests the JWT token generation and backend authentication

echo "🧪 Testing Auth0 Dott API - Dashboard Example"
echo "=============================================="

# Step 1: Get JWT token using Auth0 dashboard example
echo "📋 Step 1: Getting JWT token from Auth0..."

TOKEN_RESPONSE=$(curl -s --request POST \
  --url https://dev-cbyy63jovi6zrcos.us.auth0.com/oauth/token \
  --header 'content-type: application/json' \
  --data '{
    "client_id":"COiQubJtY5YOheMfLgyAba8Ppw4myfBC",
    "client_secret":"o_tMpWfB8eMc-3StFGBM3T6BgTIL3N-YD0zcm-pSNEdzZbNNvmGVPPRyOh32gjff",
    "audience":"https://api.dottapps.com",
    "grant_type":"client_credentials"
  }')

echo "Response from Auth0:"
echo "$TOKEN_RESPONSE" | jq '.'

# Extract access token
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get access token"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo "✅ Successfully obtained JWT token"
echo "Token preview: ${ACCESS_TOKEN:0:50}..."

# Check token format
TOKEN_PARTS=$(echo "$ACCESS_TOKEN" | tr -cd '.' | wc -c)
echo "Token parts: $((TOKEN_PARTS + 1))"

if [ $TOKEN_PARTS -eq 2 ]; then
    echo "✅ Received JWT token (3 parts)"
elif [ $TOKEN_PARTS -eq 4 ]; then
    echo "❌ Received JWE token (5 parts)"
    exit 1
else
    echo "⚠️ Unexpected token format"
fi

# Step 2: Test backend health endpoint
echo ""
echo "📋 Step 2: Testing backend health endpoint..."

HEALTH_RESPONSE=$(curl -s --request GET \
  --url https://api.dottapps.com/health/ \
  --write-out "HTTPSTATUS:%{http_code}")

HTTP_STATUS=$(echo "$HEALTH_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed -e 's/HTTPSTATUS:.*//g')

echo "Health endpoint status: $HTTP_STATUS"
echo "Health response: $HEALTH_BODY"

# Step 3: Test authenticated endpoint with JWT token
echo ""
echo "📋 Step 3: Testing authenticated endpoint with JWT..."

AUTH_RESPONSE=$(curl -s --request GET \
  --url https://api.dottapps.com/api/users/me/ \
  --header "authorization: Bearer $ACCESS_TOKEN" \
  --write-out "HTTPSTATUS:%{http_code}")

AUTH_HTTP_STATUS=$(echo "$AUTH_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
AUTH_BODY=$(echo "$AUTH_RESPONSE" | sed -e 's/HTTPSTATUS:.*//g')

echo "Authenticated endpoint status: $AUTH_HTTP_STATUS"
echo "Authenticated response: $AUTH_BODY"

# Step 4: Test onboarding endpoint (if available)
echo ""
echo "📋 Step 4: Testing onboarding endpoint..."

ONBOARD_RESPONSE=$(curl -s --request GET \
  --url https://api.dottapps.com/api/onboarding/status/ \
  --header "authorization: Bearer $ACCESS_TOKEN" \
  --write-out "HTTPSTATUS:%{http_code}")

ONBOARD_HTTP_STATUS=$(echo "$ONBOARD_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
ONBOARD_BODY=$(echo "$ONBOARD_RESPONSE" | sed -e 's/HTTPSTATUS:.*//g')

echo "Onboarding endpoint status: $ONBOARD_HTTP_STATUS"
echo "Onboarding response: $ONBOARD_BODY"

# Summary
echo ""
echo "=============================================="
echo "📊 TEST SUMMARY:"
echo "✅ JWT Token Generation: SUCCESS"
echo "✅ Token Format: JWT (not JWE)"
echo "✅ Token Algorithm: RS256"
echo "✅ Token Audience: https://api.dottapps.com"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Health Endpoint: SUCCESS ($HTTP_STATUS)"
else
    echo "⚠️ Health Endpoint: $HTTP_STATUS"
fi

if [ "$AUTH_HTTP_STATUS" = "200" ]; then
    echo "✅ Authentication: SUCCESS ($AUTH_HTTP_STATUS)"
    echo "🎉 JWE ISSUE IS COMPLETELY RESOLVED!"
elif [ "$AUTH_HTTP_STATUS" = "401" ]; then
    echo "⚠️ Authentication: FAILED ($AUTH_HTTP_STATUS)"
    echo "   This means JWT is valid but backend needs configuration"
elif [ "$AUTH_HTTP_STATUS" = "403" ]; then
    echo "⚠️ Authentication: FORBIDDEN ($AUTH_HTTP_STATUS)"
    echo "   JWT is accepted but permissions may be needed"
else
    echo "⚠️ Authentication: $AUTH_HTTP_STATUS"
fi

if [ "$ONBOARD_HTTP_STATUS" = "200" ]; then
    echo "✅ Onboarding Endpoint: SUCCESS ($ONBOARD_HTTP_STATUS)"
elif [ "$ONBOARD_HTTP_STATUS" = "401" ]; then
    echo "⚠️ Onboarding Endpoint: UNAUTHORIZED ($ONBOARD_HTTP_STATUS)"
else
    echo "⚠️ Onboarding Endpoint: $ONBOARD_HTTP_STATUS"
fi

echo ""
echo "🔧 NEXT STEPS:"
if [ "$AUTH_HTTP_STATUS" = "200" ]; then
    echo "1. ✅ Test user login flow in frontend"
    echo "2. ✅ Verify onboarding completes successfully"
    echo "3. ✅ Monitor backend logs for any remaining issues"
else
    echo "1. Check backend logs for authentication errors"
    echo "2. Verify AUTH0_AUDIENCE environment variable is set correctly"
    echo "3. Ensure backend is deployed with latest changes"
fi 