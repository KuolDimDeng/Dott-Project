#!/bin/bash

# Staging Environment Test Script
# Tests all staging services to ensure they're working correctly

echo "==================================="
echo "Staging Environment Test"
echo "==================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test Frontend
echo "Testing Frontend (staging.dottapps.com)..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://staging.dottapps.com)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is accessible (HTTP $FRONTEND_STATUS)${NC}"
else
    echo -e "${RED}✗ Frontend returned HTTP $FRONTEND_STATUS${NC}"
fi
echo ""

# Test Backend via Render URL (direct)
echo "Testing Backend Direct (dott-api-staging.onrender.com)..."
BACKEND_DIRECT=$(curl -s -o /dev/null -w "%{http_code}" "https://dott-api-staging.onrender.com/api/onboarding/api/pricing/by-country/?country=US")
if [ "$BACKEND_DIRECT" = "200" ]; then
    echo -e "${GREEN}✓ Backend is accessible via Render URL (HTTP $BACKEND_DIRECT)${NC}"
else
    echo -e "${RED}✗ Backend via Render returned HTTP $BACKEND_DIRECT${NC}"
fi
echo ""

# Test Backend via Custom Domain
echo "Testing Backend Custom Domain (api-staging.dottapps.com)..."
BACKEND_CUSTOM=$(curl -s -o /dev/null -w "%{http_code}" "https://api-staging.dottapps.com/api/onboarding/api/pricing/by-country/?country=US")
if [ "$BACKEND_CUSTOM" = "200" ]; then
    echo -e "${GREEN}✓ Backend is accessible via custom domain (HTTP $BACKEND_CUSTOM)${NC}"
elif [ "$BACKEND_CUSTOM" = "403" ]; then
    echo -e "${YELLOW}⚠ Backend custom domain returns 403 - Cloudflare proxy issue${NC}"
    echo "  Fix: Set api-staging.dottapps.com to 'DNS only' in Cloudflare"
else
    echo -e "${RED}✗ Backend custom domain returned HTTP $BACKEND_CUSTOM${NC}"
fi
echo ""

# Test API Response
echo "Testing API Response..."
API_RESPONSE=$(curl -s "https://dott-api-staging.onrender.com/api/onboarding/api/pricing/by-country/?country=US")
if echo "$API_RESPONSE" | grep -q "country_code"; then
    echo -e "${GREEN}✓ API returns valid JSON response${NC}"
    echo "  Sample: $(echo "$API_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(f\"Country: {data['country_code']}, Discount: {data['discount_percentage']}%\")" 2>/dev/null || echo "Could not parse")"
else
    echo -e "${RED}✗ API response is invalid${NC}"
fi
echo ""

# Check DNS Resolution
echo "Checking DNS Resolution..."
echo "Frontend DNS:"
nslookup staging.dottapps.com 8.8.8.8 2>/dev/null | grep -A1 "Name:" | tail -1 | sed 's/^/  /'
echo "Backend DNS:"
nslookup api-staging.dottapps.com 8.8.8.8 2>/dev/null | grep "canonical name" | head -1 | sed 's/^/  /'
echo ""

# Summary
echo "==================================="
echo "Summary:"
echo "==================================="
if [ "$FRONTEND_STATUS" = "200" ] && [ "$BACKEND_DIRECT" = "200" ]; then
    echo -e "${GREEN}✓ Staging environment is WORKING${NC}"
    if [ "$BACKEND_CUSTOM" = "403" ]; then
        echo -e "${YELLOW}⚠ Note: api-staging.dottapps.com needs Cloudflare DNS fix${NC}"
        echo ""
        echo "To fix Cloudflare issue:"
        echo "1. Go to Cloudflare Dashboard"
        echo "2. Navigate to DNS settings"
        echo "3. Find 'api-staging' CNAME record"
        echo "4. Click the orange cloud to make it gray (DNS only)"
        echo "5. Save changes"
    fi
else
    echo -e "${RED}✗ Staging environment has issues${NC}"
fi
echo ""

# Git Branch Info
echo "Current Git Branch:"
git branch --show-current
echo ""

echo "Test complete!"