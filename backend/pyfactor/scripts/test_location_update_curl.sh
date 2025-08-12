#!/bin/bash

# Test location update API endpoint with curl
# This tests the direct Django backend API

echo "🔍 Testing Location Update API Endpoint"
echo "======================================="

# API base URL
API_URL="http://localhost:8000"

# Test data
LOCATION_ID="1"
UPDATE_DATA='{
  "name": "Warehouse Main",
  "description": "Main warehouse location",
  "address": "123 Main Street, Suite 100, San Francisco, CA, 94105, US",
  "street_address": "123 Main Street",
  "street_address_2": "Suite 100",
  "city": "San Francisco",
  "state_province": "CA", 
  "postal_code": "94105",
  "country": "US",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "is_active": true
}'

# First, let's get a session token
echo "📡 Getting session token..."
SESSION_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/session-v2/" \
  -H "Content-Type: application/json" \
  -d '{"email": "support@dottapps.com", "password": "test123"}')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"session_id":"[^"]*' | sed 's/"session_id":"//')

if [ -z "$SESSION_ID" ]; then
  echo "❌ Failed to get session ID"
  exit 1
fi

echo "✅ Got session ID: ${SESSION_ID}"

# Now test the location update
echo ""
echo "📤 Updating location ${LOCATION_ID}..."
echo "Request data:"
echo $UPDATE_DATA | jq '.'

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${API_URL}/api/inventory/locations/${LOCATION_ID}/" \
  -H "Authorization: Session ${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -d "${UPDATE_DATA}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo "📊 Response Status: ${HTTP_CODE}"
echo "📋 Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

# Check if response is valid JSON
if echo "$BODY" | jq '.' >/dev/null 2>&1; then
  echo ""
  echo "✅ Response is valid JSON"
else
  echo ""
  echo "❌ Response is not valid JSON"
  echo "First 500 characters of response:"
  echo "$BODY" | head -c 500
fi