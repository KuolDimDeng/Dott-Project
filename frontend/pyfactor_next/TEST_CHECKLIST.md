# Session Fix Test Checklist

## Pre-Deployment Testing

### ✅ Changes Made
1. **`/api/auth/establish-session/route.js`**
   - Now validates token with backend
   - Creates full session cookies (not just token)
   - Uses Edge Runtime compatible encryption
   - Includes tenant ID in redirect URL
   - Added comprehensive logging

2. **`/auth/session-bridge/page.js`**
   - Added detailed logging for debugging
   - Added form data validation
   - Small delay before form submission

3. **`/utils/sessionEncryption.edge.js`** (NEW)
   - Edge Runtime compatible encryption
   - Uses Web Crypto API instead of Node.js crypto

### 🧪 Local Test Steps

1. **Start dev server:**
   ```bash
   cd /Users/kuoldeng/projectx/frontend/pyfactor_next
   pnpm run dev
   ```

2. **Open browser with DevTools:**
   - Go to http://localhost:3000
   - Open DevTools (F12)
   - Go to Network tab
   - Clear "Preserve log" checkbox, then check it

3. **Clear everything:**
   - Application tab > Storage > Clear site data
   - Or use Cmd+Shift+Delete (Clear browsing data)

4. **Test login:**
   - Go to /auth/signin
   - Login with test credentials
   - Watch console for:
     - `[SessionBridge]` logs
     - `[EstablishSession]` logs

5. **Verify success:**
   - ✅ No redirect to signin?error=session_error
   - ✅ Land on dashboard
   - ✅ Check Application > Cookies for:
     - dott_auth_session
     - session_token
     - appSession

### 🔍 What to Look For

**Network Tab:**
- `/api/auth/establish-session` POST request
- Response: 303 or 302 redirect
- Location header: Should be dashboard, NOT signin
- Set-Cookie headers: Should see multiple

**Console:**
```
[SessionBridge] Component mounted
[SessionBridge] Bridge data exists: true
[SessionBridge] Parsed bridge data: {...}
[SessionBridge] Form element found: true
[SessionBridge] Submitting form with data: {...}
[EstablishSession] POST request received
[EstablishSession] Creating full session from token
[EstablishSession] Backend user data: {...}
[EstablishSession] Session established successfully
[EstablishSession] Redirecting to: /tenant-id/dashboard
```

**Application Tab > Cookies:**
- `dott_auth_session`: Large encrypted value
- `session_token`: Backend token
- `appSession`: Same as dott_auth_session

### 🚨 If It Fails

1. **Check logs** in console for errors
2. **Check Network tab** for failed requests
3. **Verify backend is running** at https://api.dottapps.com
4. **Check cookie domain** settings if on production

### 📦 Before Deploying

1. Run build to check for errors:
   ```bash
   pnpm run build
   ```

2. Remove debug files (optional):
   ```bash
   rm src/app/debug/session-test/page.js
   rm src/app/api/debug/mock-auth/route.js
   rm test-session-fix.html
   ```

3. Commit and push:
   ```bash
   git add -A
   git commit -m "Fix session establishment after cache clear - proper cookie creation"
   git push origin Dott_Main_Dev_Deploy
   ```

### 🎯 Expected Result

Users who clear their cache should now be able to login without getting stuck in a redirect loop. The fix ensures proper session cookies are created during the session bridge flow.