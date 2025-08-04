#!/bin/bash

# 🧪 COMPREHENSIVE AUTHENTICATION FLOW TESTING
# Automated and manual testing procedures

echo "🧪 AUTHENTICATION FLOW TESTING GUIDE"
echo "====================================="

# Create comprehensive test plan
cat > auth-testing-plan.md << 'TESTPLAN'
# 🧪 Authentication Flow Testing Plan

## 🎯 OBJECTIVE
Verify all authentication flows work correctly after security fixes

## 📋 TEST SCENARIOS

### ✅ 1. LOGIN FLOWS
- [ ] **Email/Password Login**
  - Navigate to /signin
  - Enter valid credentials
  - Verify redirect to dashboard
  - Check session cookie is set

- [ ] **Google OAuth Login**  
  - Click "Sign in with Google"
  - Complete OAuth flow
  - Verify redirect to dashboard
  - Check session established

- [ ] **Auth0 Universal Login**
  - Test Auth0 hosted login page
  - Verify token exchange
  - Check session establishment

### ✅ 2. SESSION MANAGEMENT
- [ ] **Session Persistence**
  - Login and close browser
  - Reopen browser and navigate to app
  - Verify auto-login works

- [ ] **Session Refresh**
  - Wait for token to near expiry
  - Make authenticated request
  - Verify token refreshes automatically

- [ ] **Session Timeout**
  - Login and wait 15 minutes inactive
  - Verify timeout modal appears
  - Check automatic logout after timeout

### ✅ 3. LOGOUT FLOWS
- [ ] **Manual Logout**
  - Click logout button
  - Verify redirect to signin page
  - Check session cookies cleared
  - Verify backend session invalidated

- [ ] **Automatic Logout**
  - Force session expiry
  - Make authenticated request
  - Verify automatic redirect to signin

### ✅ 4. SECURITY FEATURES
- [ ] **Device Fingerprinting**
  - Login from new device/browser
  - Verify security check triggered
  - Check device trust establishment

- [ ] **Failed Login Protection**
  - Attempt 5+ failed logins
  - Verify account lockout
  - Check unlock mechanism

- [ ] **Session Security**
  - Check session cookies have proper flags
  - Verify HttpOnly, Secure, SameSite settings
  - Test cross-origin session handling

### ✅ 5. API AUTHENTICATION
- [ ] **Authenticated API Calls**
  - Make API calls with valid session
  - Verify 200 responses
  - Check data returns correctly

- [ ] **Unauthenticated API Calls**
  - Make API calls without session
  - Verify 401 Unauthorized responses
  - Check error handling

- [ ] **Expired Session API Calls**
  - Make API calls with expired session
  - Verify 401 responses
  - Check token refresh attempted

## 🛠️ AUTOMATED TESTING SCRIPTS

### Script 1: Basic Auth Flow Test
```bash
#!/bin/bash
echo "🧪 Testing basic authentication flow..."

# Test login endpoint
curl -X POST http://localhost:3000/api/auth/session-v2 \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}' \
  -c cookies.txt -v

# Test authenticated endpoint  
curl -X GET http://localhost:3000/api/user/me \
  -b cookies.txt -v

# Test logout
curl -X DELETE http://localhost:3000/api/auth/session-v2 \
  -b cookies.txt -v
```

### Script 2: Session Validation Test
```bash
#!/bin/bash
echo "🧪 Testing session validation..."

# Get session ID from cookie
SESSION_ID=$(grep 'sid' cookies.txt | awk '{print $7}')

# Test session validation
curl -X GET "http://localhost:3000/api/auth/session-verify" \
  -H "Authorization: Session $SESSION_ID" -v
```

### Script 3: Security Headers Test  
```bash
#!/bin/bash
echo "🧪 Testing security headers..."

# Check security headers on login page
curl -I http://localhost:3000/signin

# Expected headers:
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
# - Strict-Transport-Security: max-age=31536000
```

## 📊 SUCCESS CRITERIA

### ✅ Functional Requirements
- All login methods work correctly
- Sessions persist and refresh properly  
- Logout clears all session data
- API authentication works as expected

### ✅ Security Requirements
- Session tokens are properly masked in logs
- Security headers are present
- Failed login attempts are rate limited
- Device fingerprinting functions correctly

### ✅ Performance Requirements
- Login completes within 3 seconds
- Session validation under 500ms
- Token refresh seamless to user
- Logout immediate (< 1 second)

## 🐛 TROUBLESHOOTING GUIDE

### Common Issues:
1. **"Session not found" errors**
   - Check session cookie domain settings
   - Verify backend session storage

2. **Infinite redirect loops**
   - Check onboarding completion status
   - Verify tenant ID in session

3. **CORS errors on auth**
   - Check CORS_ALLOWED_ORIGINS settings
   - Verify Cloudflare configuration

4. **Token refresh failures**
   - Check Auth0 token expiry settings
   - Verify refresh token storage

## 📝 TEST EXECUTION LOG

Date: ___________
Tester: ___________

| Test Case | Status | Notes |
|-----------|--------|-------|
| Email Login | ⬜ | |  
| Google OAuth | ⬜ | |
| Session Persistence | ⬜ | |
| Token Refresh | ⬜ | |
| Manual Logout | ⬜ | |
| Auto Logout | ⬜ | |
| API Auth | ⬜ | |
| Security Headers | ⬜ | |

## 🚀 POST-TEST ACTIONS

After successful testing:
- [ ] Update monitoring alerts
- [ ] Document any configuration changes
- [ ] Deploy to production
- [ ] Monitor auth metrics for 24 hours
TESTPLAN

# Create automated testing script
cat > run-auth-tests.sh << 'AUTOTEST'
#!/bin/bash

echo "🚀 RUNNING AUTOMATED AUTHENTICATION TESTS"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "🧪 Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
    fi
}

# Test 1: Frontend accessibility
run_test "Frontend Loading" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 | grep -q '200'"

# Test 2: API health
run_test "API Health" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health | grep -q '200'"

# Test 3: Auth endpoints exist
run_test "Auth Endpoints" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/auth/session-v2"

# Test 4: Security headers
run_test "Security Headers" "curl -I -s http://localhost:3000 | grep -q 'X-Frame-Options'"

# Test 5: Session creation (mock)
run_test "Session API" "curl -s -X POST http://localhost:3000/api/auth/session-v2 -H 'Content-Type: application/json' -d '{}' | grep -q 'error'"

echo ""
echo "📊 TEST RESULTS:"
echo "==============="
echo -e "✅ Passed: ${GREEN}$PASSED${NC}"
echo -e "❌ Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}ALL TESTS PASSED!${NC}"
    echo "✅ Ready for manual testing"
else
    echo -e "\n⚠️  ${YELLOW}SOME TESTS FAILED${NC}"
    echo "🔍 Manual investigation required"
fi

echo ""
echo "📋 NEXT STEPS:"
echo "1. Run manual tests from auth-testing-plan.md"
echo "2. Test in multiple browsers"
echo "3. Verify mobile compatibility"
echo "4. Check production environment"
AUTOTEST

chmod +x run-auth-tests.sh

echo ""
echo "✅ AUTHENTICATION TESTING PLAN CREATED"
echo "======================================"
echo ""
echo "📄 Files created:"
echo "   - auth-testing-plan.md (comprehensive test plan)"
echo "   - run-auth-tests.sh (automated tests)"
echo ""
echo "🚀 TO START TESTING:"
echo "   1. ./run-auth-tests.sh"
echo "   2. Follow manual tests in auth-testing-plan.md"
echo "   3. Document results in execution log"
echo ""
echo "⏱️  ESTIMATED TIME: 1 hour"
echo "🎯 SUCCESS: All authentication flows work correctly"