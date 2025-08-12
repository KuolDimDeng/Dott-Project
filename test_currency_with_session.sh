#!/bin/bash

echo "🧪 Currency API Test with Session"
echo "=================================="
echo ""
echo "This script tests the currency API with a valid session."
echo "You need to be logged in to the app first."
echo ""

# Function to extract cookie value
get_cookie() {
    local cookie_name=$1
    local cookie_header=$2
    echo "$cookie_header" | grep -o "${cookie_name}=[^;]*" | cut -d'=' -f2
}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Get current session
echo "Step 1: Checking current session..."
echo "Please make sure you're logged in at http://localhost:3000"
echo ""

# Test if we can reach the session endpoint
SESSION_RESPONSE=$(curl -s -c cookies.txt http://localhost:3000/api/auth/session-v2)
echo "Session response: $SESSION_RESPONSE"
echo ""

# Step 2: Test GET preferences
echo "Step 2: Testing GET /api/currency/preferences..."
GET_RESPONSE=$(curl -s -b cookies.txt \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/currency/preferences)

echo "GET Response:"
echo "$GET_RESPONSE" | jq . 2>/dev/null || echo "$GET_RESPONSE"
echo ""

# Check if authenticated
if echo "$GET_RESPONSE" | grep -q "Not authenticated"; then
    echo -e "${RED}❌ Not authenticated. Please log in first.${NC}"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Log in with your credentials"
    echo "3. Run this script again"
    rm -f cookies.txt
    exit 1
fi

# Step 3: Test PUT to update currency
echo "Step 3: Testing PUT /api/currency/preferences (updating to EUR)..."
PUT_RESPONSE=$(curl -s -b cookies.txt \
  -X PUT \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "currency_code": "EUR",
    "currency_name": "Euro",
    "currency_symbol": "€",
    "previous_currency": "USD"
  }' \
  http://localhost:3000/api/currency/preferences)

echo "PUT Response:"
echo "$PUT_RESPONSE" | jq . 2>/dev/null || echo "$PUT_RESPONSE"
echo ""

# Step 4: Verify the change
echo "Step 4: Verifying the change..."
VERIFY_RESPONSE=$(curl -s -b cookies.txt \
  -H "Accept: application/json" \
  http://localhost:3000/api/currency/preferences)

echo "Verification Response:"
echo "$VERIFY_RESPONSE" | jq . 2>/dev/null || echo "$VERIFY_RESPONSE"
echo ""

# Check if update was successful
if echo "$VERIFY_RESPONSE" | grep -q '"currency_code":"EUR"'; then
    echo -e "${GREEN}✅ Currency successfully updated to EUR!${NC}"
else
    echo -e "${RED}❌ Currency update may have failed${NC}"
fi

# Cleanup
rm -f cookies.txt

echo ""
echo "Test complete!"