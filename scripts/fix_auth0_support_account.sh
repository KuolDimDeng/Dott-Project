#!/bin/bash

# Script to fix Auth0 support account login issues
# This helps debug and fix the support@dottapps.com login problem

echo "=========================================="
echo "Auth0 Support Account Fix Script"
echo "=========================================="
echo ""
echo "This script will help diagnose and fix the support@dottapps.com login issue."
echo ""

# Auth0 Configuration
AUTH0_DOMAIN="dev-cbyy63jovi6zrcos.us.auth0.com"
AUTH0_CLIENT_ID="9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF"
EMAIL="support@dottapps.com"

echo "Auth0 Domain: $AUTH0_DOMAIN"
echo "Client ID: $AUTH0_CLIENT_ID"
echo "Email: $EMAIL"
echo ""

echo "----------------------------------------"
echo "STEP 1: Clear Browser Cache"
echo "----------------------------------------"
echo "Please clear your browser cache and cookies for dottapps.com:"
echo "1. Open Chrome DevTools (F12)"
echo "2. Go to Application tab"
echo "3. Clear Storage > Clear site data"
echo ""

echo "----------------------------------------"
echo "STEP 2: Reset Failed Login Attempts"
echo "----------------------------------------"
echo "Run this in your browser console on dottapps.com:"
echo ""
cat << 'EOF'
// Clear failed login attempts
if (typeof window !== 'undefined' && window.anomalyDetector) {
  window.anomalyDetector.loginAttempts.delete('support@dottapps.com');
  console.log('Cleared failed login attempts for support@dottapps.com');
}

// Clear security-related localStorage
localStorage.removeItem('failedLoginAttempts');
localStorage.removeItem('securityEvents');
localStorage.removeItem('accountLockout');

// Clear sessionStorage
sessionStorage.clear();

console.log('✅ Login lockout has been reset');
EOF
echo ""

echo "----------------------------------------"
echo "STEP 3: Test Direct Auth0 Authentication"
echo "----------------------------------------"
echo "Run this curl command to test Auth0 directly:"
echo ""
echo "curl -X POST https://$AUTH0_DOMAIN/oauth/token \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"grant_type\": \"password\","
echo "    \"username\": \"$EMAIL\","
echo "    \"password\": \"YOUR_PASSWORD_HERE\","
echo "    \"client_id\": \"$AUTH0_CLIENT_ID\","
echo "    \"client_secret\": \"YOUR_CLIENT_SECRET_HERE\","
echo "    \"audience\": \"https://api.dottapps.com\","
echo "    \"scope\": \"openid profile email\""
echo "  }'"
echo ""
echo "Replace YOUR_PASSWORD_HERE with the actual password"
echo "Replace YOUR_CLIENT_SECRET_HERE with the Auth0 client secret"
echo ""

echo "----------------------------------------"
echo "STEP 4: Check Auth0 User Status"
echo "----------------------------------------"
echo "1. Log into Auth0 Dashboard: https://manage.auth0.com"
echo "2. Go to User Management > Users"
echo "3. Search for: $EMAIL"
echo "4. Check if the user exists and is:"
echo "   - Email verified: ✓"
echo "   - Not blocked: ✓"
echo "   - Has correct password"
echo ""

echo "----------------------------------------"
echo "STEP 5: Reset Password (if needed)"
echo "----------------------------------------"
echo "If the password is incorrect or unknown:"
echo "1. Go to: https://dottapps.com/auth/signin"
echo "2. Click 'Forgot password?'"
echo "3. Enter: $EMAIL"
echo "4. Check email for reset link"
echo ""

echo "----------------------------------------"
echo "STEP 6: Create User via API (if doesn't exist)"
echo "----------------------------------------"
echo "If the user doesn't exist in Auth0, create it:"
echo ""
cat << 'EOF'
# First, get a Management API token
# Then create the user:

curl -X POST https://dev-cbyy63jovi6zrcos.us.auth0.com/api/v2/users \
  -H "Authorization: Bearer YOUR_MGMT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "support@dottapps.com",
    "email_verified": true,
    "password": "SecurePassword123!",
    "connection": "Username-Password-Authentication",
    "name": "Support Team",
    "given_name": "Support",
    "family_name": "Team"
  }'
EOF
echo ""

echo "=========================================="
echo "Debugging Tips:"
echo "=========================================="
echo "1. The 401 errors indicate incorrect credentials"
echo "2. The frontend bypass has been added for support@dottapps.com"
echo "3. Check backend logs: render logs dott-api"
echo "4. Test with a simple password first (no special chars)"
echo "5. Ensure Auth0 application has Password grant enabled"
echo ""

echo "Need more help? Check:"
echo "- Auth0 logs: https://manage.auth0.com > Monitoring > Logs"
echo "- Backend logs: render logs dott-api --tail"
echo "- Frontend console: Browser DevTools > Console"
echo ""