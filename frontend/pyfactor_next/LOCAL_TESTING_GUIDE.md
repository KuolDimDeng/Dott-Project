# Local Testing Guide for Session Issue

## Quick Test Methods

### Method 1: Browser Developer Tools Test

1. **Start your dev server:**
   ```bash
   pnpm run dev
   ```

2. **Open Chrome DevTools** (F12) and go to the Console tab

3. **Clear everything and test:**
   ```javascript
   // Run this in the Console to simulate the login flow
   
   // Step 1: Clear all storage
   localStorage.clear();
   sessionStorage.clear();
   document.cookie.split(";").forEach(c => {
     document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   });
   console.log('✅ Cleared all storage and cookies');
   
   // Step 2: Create mock session bridge data
   const mockBridgeData = {
     token: 'test-token-' + Date.now(),
     redirectUrl: '/dashboard',
     timestamp: Date.now()
   };
   sessionStorage.setItem('session_bridge', JSON.stringify(mockBridgeData));
   console.log('✅ Set bridge data:', mockBridgeData);
   
   // Step 3: Navigate to session bridge
   window.location.href = '/auth/session-bridge';
   ```

4. **Watch the Console for logs** - you should see:
   - `[SessionBridge]` logs
   - `[EstablishSession]` logs
   - Any errors

### Method 2: Debug Page Test

1. **Navigate to:** http://localhost:3000/debug/session-test

2. **Click "Run All Tests"** to automatically test the session flow

3. **Check results** on the page and in the console

### Method 3: Mock Authentication Test

1. **Run this in your terminal:**
   ```bash
   # Create a mock session
   curl -X POST http://localhost:3000/api/debug/mock-auth \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "tenantId": "test-123"}' \
     | jq .
   ```

2. **Copy the bridgeData from the response** and run in browser console:
   ```javascript
   const bridgeData = /* paste bridgeData here */;
   sessionStorage.setItem('session_bridge', JSON.stringify(bridgeData));
   window.location.href = '/auth/session-bridge';
   ```

### Method 4: Command Line Test

```bash
# Make the script executable
chmod +x scripts/test_session_locally.sh

# Run the test
./scripts/test_session_locally.sh
```

## What to Look For

### Success Indicators:
- ✅ No redirect loop back to signin
- ✅ Session cookie is set (check Application > Cookies in DevTools)
- ✅ You can access /dashboard without being redirected
- ✅ Console shows "Session established successfully"

### Failure Indicators:
- ❌ Redirect to /auth/signin?error=session_error
- ❌ Console shows "Missing required parameters"
- ❌ No cookies are set
- ❌ Backend validation fails

## Debugging Tips

1. **Check Network Tab:**
   - Look for `/api/auth/establish-session` POST request
   - Check if it returns 303/302 redirect
   - Look for Set-Cookie headers

2. **Check Application Tab:**
   - Cookies > localhost - look for:
     - `dott_auth_session`
     - `session_token`
     - `appSession`

3. **Add More Logging:**
   Edit `/src/app/api/auth/establish-session/route.js` and add:
   ```javascript
   console.log('[DEBUG] Full request headers:', Object.fromEntries(request.headers.entries()));
   console.log('[DEBUG] Cookies before set:', await cookies().getAll());
   ```

4. **Test with Different Scenarios:**
   - With real Auth0 token
   - With mock token
   - With expired timestamp
   - With invalid redirect URL

## Common Issues and Fixes

### Issue: "Missing required parameters"
- Check that token and redirectUrl are being passed in the form
- Verify sessionStorage has the bridge data

### Issue: "Request expired"
- The timestamp is older than 60 seconds
- Make sure the bridge is processed quickly

### Issue: Backend validation fails
- The token format might be wrong
- Check if backend expects Bearer token vs Session token
- Verify the backend API URL is correct

### Issue: Cookies not being set
- Check if you're on HTTPS locally (some browsers require it)
- Try changing sameSite from 'strict' to 'lax'
- Verify domain settings in cookie options

## Quick Fix Test

If you want to bypass the whole flow and just test if sessions work:

```javascript
// Run in console to create a fake session
fetch('/api/auth/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    accessToken: 'fake-token',
    user: {
      email: 'test@example.com',
      tenantId: 'test-123',
      needsOnboarding: false
    }
  })
}).then(() => {
  console.log('Session created, now check /api/auth/session');
  return fetch('/api/auth/session');
}).then(r => r.json()).then(console.log);
```

## Before Deploying

1. **Run all tests locally** and ensure they pass
2. **Test with a real Auth0 login** if possible
3. **Check that no debug code** is left in production files
4. **Verify Edge Runtime compatibility** by running `pnpm run build`

## Emergency Rollback

If the fix causes issues in production:

```bash
# Rollback to previous version
git revert HEAD
git push origin Dott_Main_Dev_Deploy
```

The session bridge approach should solve the issue, but test thoroughly locally first!