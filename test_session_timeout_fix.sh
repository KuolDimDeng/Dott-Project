#!/bin/bash

echo "🔒 Testing Session Timeout Fix"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This test will verify that the session refresh works correctly when user clicks 'Back to Dott'${NC}"
echo ""

echo "1. First, ensure the backend is running:"
echo "   docker-compose -f docker-compose.local.yml up -d"
echo ""

echo "2. Test the session refresh endpoint directly:"
echo ""

# Test with a dummy session ID (replace with actual session ID when testing)
SESSION_ID="your-session-id-here"

echo "To test manually:"
echo ""
echo "curl -X PATCH http://localhost:8000/api/auth/session-v2 \\"
echo "  -H 'Authorization: Session \$SESSION_ID' \\"
echo "  -H 'Content-Type: application/json'"
echo ""

echo -e "${GREEN}Expected Result:${NC}"
echo "- HTTP 200 OK"
echo "- Response should include updated expires_at timestamp"
echo "- Session should be extended by 24 hours"
echo ""

echo -e "${YELLOW}Frontend Testing:${NC}"
echo "1. Let your session sit idle for 15 minutes"
echo "2. When the timeout warning appears, click 'Back to Dott'"
echo "3. The session should be refreshed without logging you out"
echo "4. You should be able to continue using the application"
echo ""

echo -e "${GREEN}✅ Fix Summary:${NC}"
echo "- Updated SessionTimeoutModal to call PATCH /api/auth/session-v2"
echo "- Fixed backend to use correct session_id field (not session_token)"
echo "- Added proper session extension logic"
echo "- Reset activity timer when session is refreshed"