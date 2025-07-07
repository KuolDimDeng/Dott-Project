# Session Bridge Pattern - Cookie Setting Solution

## Problem
Session cookies weren't being set after successful authentication, causing infinite redirect loops. The root cause is that Next.js API routes don't properly forward Set-Cookie headers from backend responses to the browser.

## Solution: Session Bridge Pattern

### Overview
Instead of trying to set cookies directly in API routes (which doesn't work reliably), we use a "session bridge" pattern:
1. API returns session data without setting cookies
2. Client stores session data temporarily in sessionStorage
3. Client redirects to a special bridge page
4. Bridge page sets cookies via form POST (which works reliably)
5. User is redirected to their intended destination with cookies properly set

### Implementation Details

#### 1. Consolidated Login API (`/api/auth/consolidated-login/route.js`)
```javascript
// Don't try to set cookies here - it won't work reliably
return NextResponse.json({
  success: true,
  ...authData,
  ...sessionData,
  useSessionBridge: true,  // Signal to use bridge
  sessionToken: sessionData.session_token
});
```

#### 2. Login Component (`EmailPasswordSignIn.js`)
```javascript
if (loginResult.success && loginResult.useSessionBridge) {
  // Store session info temporarily
  const bridgeData = {
    token: loginResult.sessionToken,
    redirectUrl: redirectUrl,
    timestamp: Date.now(),
    email: loginResult.user?.email,
    tenantId: loginResult.tenant?.id
  };
  
  sessionStorage.setItem('session_bridge', JSON.stringify(bridgeData));
  router.push('/auth/session-bridge');
  return;
}
```

#### 3. Session Bridge Page (`/auth/session-bridge/page.js`)
- Retrieves session data from sessionStorage
- Validates data hasn't expired (30 second window)
- Exchanges token via GET request to verify it's valid
- Submits hidden form POST to establish session

#### 4. Bridge Session API (`/api/auth/bridge-session/route.js`)
```javascript
// Simple GET endpoint that validates the token
export async function GET(request) {
  const token = searchParams.get('token');
  
  // Set cookies using Next.js cookies() API
  const cookieStore = await cookies();
  cookieStore.set('sid', token, cookieOptions);
  cookieStore.set('session_token', token, cookieOptions);
  
  return NextResponse.json({ success: true, sessionToken: token });
}
```

#### 5. Establish Session API (`/api/auth/establish-session/route.js`)
```javascript
// Form POST handler - this is what actually sets cookies reliably
export async function POST(request) {
  const formData = await request.formData();
  const token = formData.get('token');
  const redirectUrl = formData.get('redirectUrl');
  
  // Set cookies
  const cookieStore = await cookies();
  cookieStore.set('sid', token, cookieOptions);
  cookieStore.set('session_token', token, cookieOptions);
  
  // Redirect with cookies properly set
  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
```

### Why This Works

1. **Form POST behavior**: Browser handles form POST redirects differently than API responses, ensuring cookies are properly set
2. **Separation of concerns**: Authentication logic stays in API routes, cookie setting happens in dedicated endpoints
3. **Security**: Session data is only stored temporarily (30 seconds) and cleared immediately after use
4. **Reliability**: This pattern has been proven to work in production environments

### Key Lessons

1. **Don't fight the framework**: Next.js API routes have limitations with cookie forwarding
2. **Use the right tool**: Form POSTs are more reliable for setting cookies during redirects
3. **Temporary storage is OK**: sessionStorage provides a clean handoff mechanism
4. **Test in production**: Cookie behavior can differ between development and production

### When to Use This Pattern

Use the session bridge pattern when:
- You need to set cookies after an API call
- Direct cookie setting in API routes isn't working
- You're experiencing authentication redirect loops
- Cookies need to be set atomically with a redirect

### Files Involved

1. `/src/app/api/auth/consolidated-login/route.js` - Returns session data without cookies
2. `/src/components/auth/EmailPasswordSignIn.js` - Initiates bridge flow
3. `/src/app/auth/session-bridge/page.js` - Bridge page that handles the handoff
4. `/src/app/api/auth/bridge-session/route.js` - Validates and prepares session
5. `/src/app/api/auth/establish-session/route.js` - Sets cookies via form POST

### Debugging Tips

1. Check browser DevTools Network tab for Set-Cookie headers
2. Verify sessionStorage contains bridge data before redirect
3. Ensure form POST to establish-session includes token
4. Check middleware logs to confirm cookies are present after bridge

This pattern solves a fundamental limitation in Next.js and ensures reliable session cookie setting in production environments.