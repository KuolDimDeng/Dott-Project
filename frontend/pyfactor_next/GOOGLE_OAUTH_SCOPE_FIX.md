# Google OAuth Scope Fix

## Problem
Google Sign-In was failing with the error:
```
Access blocked: Authorization Error
Some requested scopes were invalid. {invalid=[profile
email
openid]}
Error 400: invalid_scope
```

## Root Cause Analysis

### Issue 1: Incorrect Scope Joining
The OAuth scopes were being incorrectly joined in the manual OAuth URL construction:

**Before (Incorrect):**
```javascript
const scopes = getOAuthScopes().join('+');  // Joined with '+'
// Later in URL construction:
scope=${encodeURIComponent(scopes.join(' '))}  // Tried to join again
```

**After (Fixed):**
```javascript
const scopes = getOAuthScopes();  // Keep as array
// Later in URL construction:
scope=${encodeURIComponent(scopes.join(' '))}  // Join with spaces once
```

### Issue 2: Non-Standard Scope Order
OAuth scopes were in non-standard order which some providers reject:

**Before:** `email,profile,openid`
**After:** `openid,profile,email` (standard OAuth order)

## Changes Made

### 1. Fixed Scope Joining Logic
- **File:** `src/config/amplifyUnified.js`
- **Lines:** 683, 734
- **Change:** Removed premature `.join('+')` calls
- **Result:** Scopes are now properly joined with spaces in URL

### 2. Updated Scope Order
- **Files:** Multiple configuration files
- **Change:** Reordered scopes to `openid,profile,email`
- **Reason:** Follows OAuth 2.0 / OpenID Connect standards

### 3. Enhanced Debugging
- **File:** `src/config/amplifyUnified.js`
- **Addition:** Added detailed logging for scope processing
- **Addition:** Added `window.testOAuthURL()` function for testing

## Files Updated

### Configuration Files
- `production.env`
- `vercel.json`
- `amplify.env.example`

### Development Scripts
- `scripts/set-oauth-env.sh`
- `scripts/dev-with-oauth.sh`

### Core Code
- `src/config/amplifyUnified.js`

## Testing

### Browser Console Test
Run in browser console to verify OAuth URL generation:
```javascript
window.testOAuthURL()
```

### Expected Output
```
=== OAuth URL Test ===
Raw scopes array: ["openid", "profile", "email"]
Scopes joined with spaces: "openid profile email"
Scopes URL encoded: "openid%20profile%20email"
Generated OAuth URL: https://us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com/oauth2/authorize?...
```

## Verification Steps

1. **Check Environment Variables:**
   ```bash
   echo $NEXT_PUBLIC_OAUTH_SCOPES
   # Should output: openid,profile,email
   ```

2. **Test Google Sign-In:**
   - Navigate to sign-in page
   - Click "Sign in with Google"
   - Should redirect to Google OAuth without scope errors

3. **Monitor Browser Console:**
   - Look for OAuth configuration logs
   - Verify scopes are properly formatted

## Environment Variable Updates Required

### Production (Vercel Dashboard)
Update the environment variable:
```
NEXT_PUBLIC_OAUTH_SCOPES=openid,profile,email
```

### Local Development
Use the updated development script:
```bash
npm run dev:oauth
```

Or manually set:
```bash
export NEXT_PUBLIC_OAUTH_SCOPES=openid,profile,email
```

## Technical Details

### OAuth Scope Standards
- **OpenID Connect:** Requires `openid` scope first
- **Google OAuth:** Expects standard scope order
- **AWS Cognito:** Passes scopes through to identity provider

### URL Encoding
- Scopes must be space-separated in OAuth URLs
- Spaces are URL-encoded as `%20`
- Incorrect joining caused malformed scope parameters

## Deployment

1. **Code Changes:** Already committed to repository
2. **Environment Variables:** Update in Vercel dashboard
3. **Testing:** Verify Google Sign-In functionality
4. **Monitoring:** Check for OAuth-related errors in logs

## Related Issues

- **Original Error:** `invalid_scope` from Google OAuth
- **Secondary Issue:** Scope order sensitivity
- **Tertiary Issue:** Double-joining of scope arrays

## Prevention

- Use standard OAuth scope order (`openid` first)
- Avoid premature string joining in array processing
- Test OAuth URLs with browser console tools
- Monitor OAuth provider error messages for scope issues 