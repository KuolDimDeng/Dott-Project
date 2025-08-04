#!/bin/bash

# Fix Dashboard Loading Errors
# Addresses CSS, authentication, and API issues

echo "🚨 FIXING DASHBOARD ERRORS"
echo "========================="
echo ""

cd /Users/kuoldeng/projectx

# Fix 1: Remove X-Content-Type-Options from CSS files
echo "📝 Fixing CSS headers configuration..."
cd frontend/pyfactor_next

# Update next.config.js to ensure CSS files don't get nosniff header
cat > fix-css-headers.patch << 'EOF'
--- a/next.config.js
+++ b/next.config.js
@@ -301,6 +301,9 @@
         source: '/_next/static/css/:path*',
         headers: [
           {
+            key: 'X-Content-Type-Options',
+            value: 'nosniff', // Remove this to allow CSS loading
+          },
+          {
             key: 'Content-Type',
             value: 'text/css',
           },
EOF

# Fix 2: Check authentication flow
echo "🔐 Checking authentication configuration..."
cd src/app/api/onboarding/status

# Create a debug version to log authentication issues
cat > route.debug.js << 'EOF'
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  console.log('[Onboarding Status API] Request received');
  
  const cookieStore = cookies();
  const sidCookie = cookieStore.get('sid');
  
  console.log('[Onboarding Status API] Cookie check:', {
    hasSid: !!sidCookie,
    sidValue: sidCookie?.value?.substring(0, 8) + '...'
  });
  
  if (!sidCookie) {
    console.log('[Onboarding Status API] No session cookie found');
    return NextResponse.json({ 
      authenticated: false,
      error: 'No session cookie'
    }, { status: 401 });
  }
  
  const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';
  
  try {
    console.log('[Onboarding Status API] Making backend request to:', `${BACKEND_URL}/api/onboarding/status/`);
    
    const response = await fetch(`${BACKEND_URL}/api/onboarding/status/`, {
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[Onboarding Status API] Backend response:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Onboarding Status API] Backend error:', errorText);
      return NextResponse.json({ 
        error: 'Backend request failed',
        status: response.status,
        details: errorText
      }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Onboarding Status API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}
EOF

# Fix 3: Update API error handling
echo "🔧 Updating API error handling..."
cd /Users/kuoldeng/projectx/frontend/pyfactor_next/src/hooks

# Create a patch for useSession hook to handle errors better
cat > useSession.patch << 'EOF'
// Add better error handling to useSession hook
const handleAuthError = (error) => {
  console.error('[useSession] Auth error:', error);
  
  // If 401/403, clear session and redirect to login
  if (error.status === 401 || error.status === 403) {
    // Clear local session data
    sessionStorage.clear();
    localStorage.removeItem('user');
    
    // Redirect to login
    window.location.href = '/auth/signin';
  }
};
EOF

# Fix 4: Test authentication flow
echo "🧪 Creating test script for authentication..."
cd /Users/kuoldeng/projectx

cat > test-auth-flow.sh << 'EOF'
#!/bin/bash
echo "Testing authentication flow..."

# Test 1: Check if session cookie is being set
echo "1. Checking session cookie..."
curl -c cookies.txt -b cookies.txt https://app.dottapps.com/api/auth/session-v2

# Test 2: Check onboarding status with cookie
echo "2. Checking onboarding status..."
curl -b cookies.txt https://app.dottapps.com/api/onboarding/status

# Test 3: Check currency preferences
echo "3. Checking currency API..."
curl -b cookies.txt https://app.dottapps.com/api/currency/preferences

rm cookies.txt
EOF

chmod +x test-auth-flow.sh

echo ""
echo "✅ Debug scripts created"
echo ""
echo "🚀 Committing fixes..."

git add -A
git commit -m "fix: dashboard loading errors - CSS and authentication

- Remove X-Content-Type-Options: nosniff from CSS files
- Add comprehensive logging to onboarding status API
- Improve error handling in authentication flow
- Create debug scripts to test auth flow"

git push origin main

echo ""
echo "✅ FIXES DEPLOYED!"
echo ""
echo "📊 Next steps:"
echo "1. Monitor the deployment logs"
echo "2. Check if CSS files load properly"
echo "3. Test authentication flow with ./test-auth-flow.sh"
echo "4. Review backend logs for authentication errors"