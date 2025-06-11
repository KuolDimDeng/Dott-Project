# Secure Authentication Testing Guide

## Overview
We've implemented secure cookie-based authentication to replace the insecure localStorage approach. This guide will help you test the new implementation.

## What Changed

### Backend (Django)
1. **CORS Settings Updated**:
   - Added `dottapps.com` domains to `CORS_ALLOWED_ORIGINS`
   - Enabled `CORS_ALLOW_CREDENTIALS = True`
   - Updated `CSRF_TRUSTED_ORIGINS`

2. **Cookie Settings**:
   - Changed `SESSION_COOKIE_SAMESITE` from 'None' to 'Lax'
   - Changed `CSRF_COOKIE_SAMESITE` from 'None' to 'Lax'
   - Domain set to `.dottapps.com` for cross-subdomain support

### Frontend (Next.js)
1. **New Secure Session Management**:
   - Created `/api/auth/session` with HttpOnly cookie support
   - Cookie name: `dott_auth_session`
   - Automatic migration from localStorage

2. **Updated API Calls**:
   - All fetch calls now use `credentials: 'include'`
   - Backend proxy updated to use secure cookies
   - Created `apiWithAuth` utility for secure requests

3. **Auth Migration**:
   - Automatic migration from localStorage to cookies
   - Deprecation warnings in development
   - Cleanup of old tokens

## Testing Steps

### 1. Deploy Changes
```bash
# Backend
git push origin Dott_Main_Dev_Deploy

# Wait for both deployments to complete
```

### 2. Clear Browser Data
1. Open Chrome DevTools (F12)
2. Go to Application tab
3. Clear Site Data:
   - Cookies
   - Local Storage
   - Session Storage

### 3. Test Email/Password Login
1. Go to https://dottapps.com/auth/email-signin
2. Sign in with your test account
3. Check DevTools > Application > Cookies
4. You should see:
   - `dott_auth_session` cookie (HttpOnly, Secure)
   - Domain: `.dottapps.com`
   - NO tokens in localStorage

### 4. Test Session Persistence
1. Close the browser tab
2. Open https://dottapps.com again
3. You should still be logged in
4. Check that no tokens are in localStorage

### 5. Test Cross-Domain Cookies
1. While logged in, open https://api.dottapps.com/health/
2. Check if authenticated endpoints work
3. Cookies should be sent automatically

### 6. Test Onboarding Flow
1. Create a new user
2. Complete onboarding
3. Verify data is saved correctly
4. Check no "No Auth0 session found" errors

### 7. Security Verification
1. Open Console in DevTools
2. Try to access the session cookie:
   ```javascript
   document.cookie
   ```
3. The `dott_auth_session` cookie should NOT be visible (HttpOnly)

4. Try XSS test:
   ```javascript
   localStorage.getItem('dott_session')
   ```
5. Should return `null` (no tokens in localStorage)

## Debugging

### Check Cookie Settings
```javascript
// In browser console
fetch('/api/auth/session', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log)
```

### Check Backend CORS
```bash
# On Render shell
python manage.py shell
```
```python
from django.conf import settings
print("CORS_ALLOWED_ORIGINS:", settings.CORS_ALLOWED_ORIGINS)
print("CORS_ALLOW_CREDENTIALS:", settings.CORS_ALLOW_CREDENTIALS)
print("SESSION_COOKIE_DOMAIN:", settings.SESSION_COOKIE_DOMAIN)
print("SESSION_COOKIE_SAMESITE:", settings.SESSION_COOKIE_SAMESITE)
```

### Common Issues

1. **"No Auth0 session found"**
   - Check if cookies are being set
   - Verify `credentials: 'include'` in fetch calls
   - Check browser blocks third-party cookies

2. **CORS Errors**
   - Verify backend allows credentials
   - Check origin is in allowed list
   - Ensure using HTTPS

3. **Session Not Persisting**
   - Check cookie domain settings
   - Verify SameSite policy
   - Check cookie expiration

## Rollback Plan

If issues occur, you can temporarily re-enable localStorage:

1. In `EmailPasswordSignIn.js`, uncomment:
   ```javascript
   sessionManager.saveSession({...})
   ```

2. In API calls, add auth header:
   ```javascript
   headers: {
     'Authorization': `Bearer ${sessionManager.getSession()?.accessToken}`
   }
   ```

## Success Criteria

✅ Users can log in without localStorage
✅ Sessions persist across page refreshes
✅ Cookies work across subdomains
✅ No tokens visible in localStorage
✅ HttpOnly cookies prevent XSS attacks
✅ Onboarding completes successfully

## Next Steps

After successful testing:
1. Remove all localStorage fallbacks
2. Delete sessionManager utility
3. Remove Authorization header support
4. Full security audit