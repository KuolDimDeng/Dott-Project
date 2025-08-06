#!/bin/bash

echo "=========================================="
echo "Security & Monitoring Deployment Verification"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="https://api.dottapps.com"
FRONTEND_URL="https://dottapps.com"

echo "Checking deployment status..."
echo ""

# 1. Check API Health
echo "1. Checking API Health..."
HEALTH_RESPONSE=$(curl -s -w "\nSTATUS:%{http_code}" "$API_URL/health/")
STATUS=$(echo "$HEALTH_RESPONSE" | grep "STATUS:" | cut -d: -f2)

if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ API is healthy${NC}"
else
    echo -e "${RED}❌ API health check failed (Status: $STATUS)${NC}"
fi

# 2. Check Rate Limiting Headers
echo ""
echo "2. Testing Rate Limiting..."
LOGIN_RESPONSE=$(curl -s -I -X POST "$API_URL/api/auth/password-login/" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}')

if echo "$LOGIN_RESPONSE" | grep -q "X-RateLimit"; then
    echo -e "${GREEN}✅ Rate limiting headers present${NC}"
    echo "$LOGIN_RESPONSE" | grep "X-RateLimit"
else
    echo -e "${YELLOW}⚠️ Rate limiting headers not found (may not be deployed yet)${NC}"
fi

# 3. Check API Documentation
echo ""
echo "3. Checking API Documentation..."
DOC_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/docs/")

if [ "$DOC_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ API documentation endpoint accessible${NC}"
    echo "   - Swagger UI: $API_URL/api/swagger/"
    echo "   - ReDoc: $API_URL/api/redoc/"
    echo "   - OpenAPI JSON: $API_URL/api/openapi/"
else
    echo -e "${YELLOW}⚠️ API documentation not accessible yet (Status: $DOC_RESPONSE)${NC}"
fi

# 4. Check Monitoring Dashboard
echo ""
echo "4. Checking Monitoring Dashboard..."
MONITOR_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/monitoring/health/")

if [ "$MONITOR_RESPONSE" = "200" ] || [ "$MONITOR_RESPONSE" = "401" ]; then
    if [ "$MONITOR_RESPONSE" = "401" ]; then
        echo -e "${GREEN}✅ Monitoring endpoints secured (requires admin auth)${NC}"
    else
        echo -e "${GREEN}✅ Monitoring health endpoint accessible${NC}"
    fi
    echo "   - Dashboard: $API_URL/admin/monitoring/"
    echo "   - Metrics API: $API_URL/api/monitoring/metrics/"
    echo "   - Health API: $API_URL/api/monitoring/health/"
else
    echo -e "${YELLOW}⚠️ Monitoring endpoints not accessible yet (Status: $MONITOR_RESPONSE)${NC}"
fi

# 5. Check Frontend Error Tracking
echo ""
echo "5. Checking Frontend Error Tracking..."
ERROR_TRACK_CHECK=$(curl -s "$FRONTEND_URL" | grep -c "errorTracker")

if [ "$ERROR_TRACK_CHECK" -gt 0 ]; then
    echo -e "${GREEN}✅ Frontend error tracking integrated${NC}"
else
    echo -e "${YELLOW}⚠️ Frontend error tracking not detected (may be in build process)${NC}"
fi

# 6. Test Input Validation
echo ""
echo "6. Testing Input Validation..."
VALIDATION_TEST=$(curl -s -X POST "$API_URL/api/auth/password-login/" \
    -H "Content-Type: application/json" \
    -d '{"email":"<script>alert(1)</script>","password":"test"}')

if echo "$VALIDATION_TEST" | grep -q "Invalid"; then
    echo -e "${GREEN}✅ Input validation working (XSS attempt blocked)${NC}"
else
    echo -e "${YELLOW}⚠️ Input validation response unclear${NC}"
fi

echo ""
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo ""
echo "The deployment is in progress. Full deployment typically takes 5-10 minutes."
echo ""
echo "Features being deployed:"
echo "1. ✅ API Rate Limiting - Prevents abuse with flexible limits"
echo "2. ✅ Input Validation - Protects against SQL injection and XSS"
echo "3. ✅ Error Tracking - Comprehensive frontend error monitoring"
echo "4. ✅ API Documentation - Interactive Swagger/ReDoc documentation"
echo "5. ✅ Admin Dashboard - Real-time monitoring at /admin/monitoring/"
echo ""
echo "To access the admin monitoring dashboard:"
echo "1. Log in as an admin user"
echo "2. Navigate to: $API_URL/admin/monitoring/"
echo ""
echo "To view API documentation:"
echo "- Swagger UI: $API_URL/api/swagger/"
echo "- ReDoc: $API_URL/api/redoc/"
echo ""
echo "Note: Some features may take a few minutes to become available."
echo "Run this script again in 5 minutes to verify full deployment."