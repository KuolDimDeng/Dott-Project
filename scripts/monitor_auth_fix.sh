#!/bin/bash

echo "=========================================="
echo "Authentication Fix Deployment Monitor"
echo "=========================================="
echo ""
echo "This script monitors the deployment of the authentication fix."
echo "The fix allows /api/auth/password-login/ to work without requiring a session."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_auth_endpoint() {
    echo "Testing backend authentication endpoint..."
    
    # Test with a dummy request
    RESPONSE=$(curl -s -X POST "https://api.dottapps.com/api/auth/password-login/" \
        -H "Content-Type: application/json" \
        -d '{"email": "test@example.com", "password": "test123"}' \
        -w "\n___STATUS___%{http_code}")
    
    STATUS=$(echo "$RESPONSE" | grep "___STATUS___" | cut -d "_" -f4)
    BODY=$(echo "$RESPONSE" | sed '/___STATUS___/d')
    
    echo "Response Status: $STATUS"
    
    if echo "$BODY" | grep -q "Session required"; then
        echo -e "${RED}❌ MIDDLEWARE NOT FIXED YET${NC}"
        echo "Response: $BODY"
        echo ""
        echo "The backend is still blocking the request with 'Session required'."
        echo "Deployment hasn't completed yet. Please wait..."
        return 1
    elif echo "$BODY" | grep -q "Invalid email or password"; then
        echo -e "${GREEN}✅ MIDDLEWARE FIXED!${NC}"
        echo "Response: $BODY"
        echo ""
        echo "The middleware is now allowing authentication requests!"
        echo "The 'Invalid email or password' error is expected for test credentials."
        echo "You can now try logging in with real credentials."
        return 0
    elif echo "$BODY" | grep -q "Email and password are required"; then
        echo -e "${GREEN}✅ MIDDLEWARE FIXED!${NC}"
        echo "Response: $BODY"
        echo ""
        echo "The endpoint is accessible and responding correctly."
        return 0
    elif [ "$STATUS" = "401" ]; then
        echo -e "${YELLOW}⚠️ PARTIAL SUCCESS${NC}"
        echo "Response: $BODY"
        echo ""
        echo "The endpoint is accessible but returning 401."
        echo "Check if this is an Auth0 configuration issue."
        return 0
    else
        echo -e "${YELLOW}⚠️ UNEXPECTED RESPONSE${NC}"
        echo "Response: $BODY"
        return 2
    fi
}

# Monitor loop
echo "Starting monitoring..."
echo "Press Ctrl+C to stop"
echo ""

ITERATION=0
while true; do
    ITERATION=$((ITERATION + 1))
    echo "=========================================="
    echo "Check #$ITERATION - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=========================================="
    
    if test_auth_endpoint; then
        echo ""
        echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Try logging in at https://dottapps.com/signin"
        echo "2. Use your real email and password"
        echo "3. Check browser console for debug logs if issues persist"
        echo ""
        echo "If authentication still fails after this fix, the issue might be:"
        echo "- Incorrect Auth0 configuration"
        echo "- Wrong credentials"
        echo "- Auth0 domain mismatch"
        echo ""
        break
    fi
    
    echo ""
    echo "Waiting 10 seconds before next check..."
    sleep 10
done

echo "=========================================="
echo "Additional Debugging Commands:"
echo "=========================================="
echo ""
echo "1. Check Render deployment status:"
echo "   Go to https://dashboard.render.com"
echo "   Look for 'dott-api' service"
echo "   Check for 'Deploy live' with commit 6489ae290"
echo ""
echo "2. Test with your real credentials:"
echo "   curl -X POST https://api.dottapps.com/api/auth/password-login/ \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\": \"your-email\", \"password\": \"your-password\"}'"
echo ""
echo "3. Check frontend logs:"
echo "   Open https://dottapps.com/signin"
echo "   Press F12 for Developer Tools"
echo "   Check Console tab for debug messages"
echo ""