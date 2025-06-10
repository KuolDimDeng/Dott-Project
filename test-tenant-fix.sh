#!/bin/bash

echo "🔍 Testing Tenant Lookup Fix"
echo "============================"
echo ""
echo "This script will verify that the tenant lookup is working correctly"
echo "for user kdeng@dottapps.com after clearing cache and signing in."
echo ""

# Test the backend API directly
echo "1. Testing backend API directly..."
echo "---------------------------------"
echo ""

# Get Auth0 token first
echo "Getting Auth0 access token..."
ACCESS_TOKEN=$(curl -s -X POST "https://auth.dottapps.com/oauth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF",
    "client_secret": "YOUR_CLIENT_SECRET",
    "audience": "https://api.dottapps.com",
    "grant_type": "client_credentials"
  }' | jq -r .access_token)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get Auth0 token. Using test token..."
    ACCESS_TOKEN="test-token"
fi

# Test the user profile endpoint
echo ""
echo "Testing /api/users/me endpoint..."
RESPONSE=$(curl -s -X GET "https://api.dottapps.com/api/users/me/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $RESPONSE"
echo ""

# Parse the response
TENANT_ID=$(echo $RESPONSE | jq -r .tenantId)
NEEDS_ONBOARDING=$(echo $RESPONSE | jq -r .onboarding.needsOnboarding)

echo "Results:"
echo "--------"
echo "Tenant ID: $TENANT_ID"
echo "Needs Onboarding: $NEEDS_ONBOARDING"
echo ""

if [ "$TENANT_ID" != "null" ] && [ "$NEEDS_ONBOARDING" == "false" ]; then
    echo "✅ SUCCESS! User has tenant and doesn't need onboarding"
    echo "   The fix is working correctly!"
else
    echo "❌ ISSUE DETECTED!"
    echo "   - Tenant ID is null: User has no associated tenant"
    echo "   - This is why they're being redirected to onboarding"
    echo ""
    echo "💡 Next Steps:"
    echo "   1. Run the debug script on the server:"
    echo "      cd /app/backend/pyfactor && python debug_tenant_lookup.py"
    echo "   2. Run the fix script:"
    echo "      cd /app/backend/pyfactor && python fix_tenant_owner_id.py"
fi

echo ""
echo "2. Frontend Test Instructions"
echo "-----------------------------"
echo "1. Open Chrome DevTools (F12)"
echo "2. Go to Application > Storage > Clear site data"
echo "3. Sign in with kdeng@dottapps.com"
echo "4. Check the Network tab for /api/users/me response"
echo "5. Look for 'tenantId' in the response"
echo ""
echo "Expected: tenantId should NOT be null"
echo "Reality: Based on backend logs, it IS null"
echo ""
echo "This indicates the user exists but has no tenant in the database."