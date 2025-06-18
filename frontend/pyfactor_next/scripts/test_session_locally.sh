#!/bin/bash

# Test session establishment locally
# This script helps debug the login issue without deploying

echo "🧪 Testing Session Establishment Locally"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Start the development server if not running
echo -e "\n${YELLOW}1. Checking if dev server is running...${NC}"
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}Dev server not running. Start it with: pnpm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dev server is running${NC}"

# 2. Test the establish-session endpoint directly
echo -e "\n${YELLOW}2. Testing establish-session endpoint...${NC}"
TIMESTAMP=$(date +%s)000
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/auth/establish-session \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=test-token-12345&redirectUrl=/dashboard&timestamp=$TIMESTAMP" \
  --cookie-jar cookies.txt \
  --location \
  --max-redirs 0)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "303" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✓ Redirect response received${NC}"
else
    echo -e "${RED}✗ Unexpected status code${NC}"
fi

# 3. Check cookies that were set
echo -e "\n${YELLOW}3. Cookies set by establish-session:${NC}"
if [ -f cookies.txt ]; then
    cat cookies.txt | grep -E "(session_token|dott_auth_session|appSession)"
else
    echo -e "${RED}No cookies file found${NC}"
fi

# 4. Test session retrieval
echo -e "\n${YELLOW}4. Testing session retrieval...${NC}"
SESSION_RESPONSE=$(curl -s http://localhost:3000/api/auth/session \
  --cookie cookies.txt \
  -H "X-Pending-Auth: true")

echo "Session response:"
echo "$SESSION_RESPONSE" | jq . 2>/dev/null || echo "$SESSION_RESPONSE"

# 5. Check if session is valid
if echo "$SESSION_RESPONSE" | grep -q '"authenticated":true'; then
    echo -e "\n${GREEN}✅ Session is valid!${NC}"
else
    echo -e "\n${RED}❌ Session is not valid${NC}"
fi

# 6. Test with mock Auth0 callback
echo -e "\n${YELLOW}5. Simulating Auth0 callback...${NC}"
# This simulates what happens after Auth0 redirects back
curl -s http://localhost:3000/auth/callback?code=mock-auth-code \
  --cookie-jar cookies2.txt \
  -H "User-Agent: Mozilla/5.0 (Test)"

# Cleanup
rm -f cookies.txt cookies2.txt

echo -e "\n${YELLOW}Done! Check the output above for issues.${NC}"