# Staging Authentication Redirect Fix

## Problem
Users logging into the staging environment (https://dott-staging.onrender.com) were being redirected to production (https://dottapps.com) after authentication.

## Root Cause
Several authentication-related routes had hardcoded production URLs instead of dynamically detecting the environment.

## Files Fixed

### 1. `/src/app/api/auth/establish-session-form/route.js`
- **Issue**: Line 66 had `baseUrl = 'https://dottapps.com'` hardcoded
- **Fix**: Now detects host and uses appropriate URL:
  ```javascript
  if (host && host.includes('staging')) {
    baseUrl = `https://${host}`;
  } else if (isProduction) {
    baseUrl = host ? `https://${host}` : 'https://dottapps.com';
  }
  ```

### 2. `/src/app/api/auth/login/route.js`
- **Issue**: Line 87 had fallback to `'https://dottapps.com'`
- **Fix**: Now uses request host to determine base URL:
  ```javascript
  const host = request.headers.get('host');
  if (host && host.includes('staging')) {
    baseUrl = `https://${host}`;
  } else {
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.AUTH0_BASE_URL || `https://${host || 'dottapps.com'}`;
  }
  ```

### 3. `/src/app/api/auth/consolidated-login/route.js`
- **Issues**: 
  - Hardcoded API_URL to production API
  - Hardcoded Origin headers to production
- **Fixes**:
  ```javascript
  // Dynamic API URL
  const API_URL = host && host.includes('staging') ? 'https://dott-api-staging.onrender.com' : 'https://api.dottapps.com';
  
  // Dynamic Origin header
  'Origin': host && host.includes('staging') ? `https://${host}` : 'https://dottapps.com'
  ```

## Testing
After deployment completes:
1. Navigate to https://dott-staging.onrender.com
2. Sign in with credentials
3. Verify you remain on staging environment after authentication
4. Check that the URL stays as `https://dott-staging.onrender.com/dashboard`

## Implementation Details
The fix uses the `host` header from the incoming request to determine which environment the user is on. If the host contains "staging", it uses staging-specific URLs for all redirects and API calls.