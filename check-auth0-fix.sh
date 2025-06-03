#!/bin/bash

echo "🔍 Checking Auth0 Authentication Fix Status..."
echo "============================================="

# Check if the API is responding
echo "1. Testing API health endpoint..."
health_response=$(curl -s -o /dev/null -w "%{http_code}" https://api.dottapps.com/health/)
if [ "$health_response" = "200" ]; then
    echo "✅ API health endpoint responding (200)"
else
    echo "❌ API health endpoint issue (HTTP $health_response)"
fi

# Test the users/me endpoint (this was failing before)
echo ""
echo "2. Testing /api/users/me/ endpoint (was failing with import/config errors)..."
users_response=$(curl -s -o /dev/null -w "%{http_code}" https://api.dottapps.com/api/users/me/)
if [ "$users_response" = "401" ] || [ "$users_response" = "403" ]; then
    echo "✅ /api/users/me/ endpoint responding (HTTP $users_response - authentication required, no import error)"
elif [ "$users_response" = "500" ]; then
    echo "❌ /api/users/me/ still returning 500 - may still have import/config error"
    echo "   Check logs for these errors:"
    echo "   - 'ModuleNotFoundError: No module named custom_auth.auth0_authentication'"
    echo "   - 'Invalid token: Invalid payload padding'"
else
    echo "ℹ️  /api/users/me/ returning HTTP $users_response"
fi

# Check for specific error patterns in recent logs
echo ""
echo "3. Checking for Auth0 fixes..."
echo "   Monitor your Render logs for these messages:"
echo ""
echo "   ✅ IMPORT FIX SUCCESS:"
echo "      'Auth0JWTAuthentication imported successfully'"
echo ""
echo "   ✅ CONFIG FIX SUCCESS:"
echo "      '✅ Auth0 configuration loaded successfully'"
echo "      '🔐 Using Auth0 for authentication'"
echo ""
echo "   ❌ STILL BROKEN:"
echo "      'Failed to import Auth0JWTAuthentication'"
echo "      'ModuleNotFoundError: No module named custom_auth.auth0_authentication'"
echo "      'Invalid token: Invalid payload padding'"

echo ""
echo "4. Frontend connection test..."
frontend_response=$(curl -s -o /dev/null -w "%{http_code}" https://dottapps.com/)
if [ "$frontend_response" = "200" ]; then
    echo "✅ Frontend responding (200)"
elif [ "$frontend_response" = "429" ]; then
    echo "ℹ️  Frontend responding (429 - rate limited, but accessible)"
else
    echo "ℹ️  Frontend HTTP status: $frontend_response"
fi

echo ""
echo "🎯 FIXES APPLIED:"
echo "1. ✅ Auth0 Import Issue: RESOLVED"
echo "   - Backend files now properly tracked and deployed"
echo "   - Auth0JWTAuthentication module available"
echo ""
echo "2. 🔧 Auth0 Config Mismatch: FIX DEPLOYED (waiting for deployment)"
echo "   - Updated backend to use custom domain: auth.dottapps.com"
echo "   - Fixed JWKS endpoint mismatch"
echo "   - Should resolve 'Invalid payload padding' errors"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Wait 3-5 minutes for Render deployment to complete"
echo "2. Run this script again to verify the fix"
echo "3. Check deployment status at: https://dashboard.render.com/"
echo "4. Test user login flow at: https://dottapps.com/"
echo ""
echo "If 'Invalid payload padding' errors persist after deployment:"
echo "- The configuration mismatch may need environment variable updates on Render"
echo "- Check the auth0-env-fix.txt file for required environment variables" 