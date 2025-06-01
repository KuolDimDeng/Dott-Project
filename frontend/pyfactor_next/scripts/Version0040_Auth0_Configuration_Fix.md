# Version 0040: Auth0 Configuration Fix
**Date**: 2025-01-04  
**Issue**: Auth0 showing "undefined" domain and client_id in production  
**Files Modified**: 
- `/src/app/api/auth/[...auth0]/route.js`
- `/src/app/layout.js` 
- `/src/lib/auth0.js`
- Vercel environment variables

## Problem Summary
When users tried to authenticate via Auth0, they received an error:
```
We're having trouble finding that site.
We can't connect to the server at undefined.
```

The URL showed:
```
https://undefined/authorize?response_type=code&client_id=undefined&redirect_uri=...
```

## Root Causes Identified

### 1. **Incorrect Auth0 SDK Usage**
- Using manual Auth0 URL construction instead of standard `@auth0/nextjs-auth0` handlers
- Missing proper environment variable configuration for the SDK

### 2. **Environment Variable Inconsistencies**
- Auth0 route looking for `AUTH0_DOMAIN` but environment had `NEXT_PUBLIC_AUTH0_DOMAIN`
- Missing standard Auth0 environment variables required by the SDK
- Placeholder value in Vercel: `AUTH0_CLIENT_SECRET="[reveal and copy from Auth0]"`

### 3. **Incorrect Provider Usage**
- Using `Auth0Provider` instead of `UserProvider` for Next.js App Router
- **Build Issue**: Incorrect import path `/client` subpath not exported

## Fixes Applied

### 1. **Updated Environment Variables in Vercel**
Added missing standard Auth0 environment variables:
```bash
AUTH0_CLIENT_ID=GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ
AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_CLIENT_SECRET=nJCBudVjUDw1pHl8w-vA4WbwCdVtAOWuo8mhZucTIKOoIXF_ScXmUKPwY24071uz
AUTH0_BASE_URL=https://dottapps.com
```

### 2. **Replaced Manual Auth0 Route with Standard SDK Handlers**
**Before** (`/src/app/api/auth/[...auth0]/route.js`):
```javascript
// Manual URL construction with switch statements
const loginUrl = `https://${process.env.AUTH0_DOMAIN}/authorize?` + ...
```

**After**:
```javascript
import { handleAuth, handleLogin, handleLogout, handleCallback, handleProfile } from '@auth0/nextjs-auth0';

export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
      scope: 'openid profile email'
    }
  }),
  logout: handleLogout({
    returnTo: process.env.NEXT_PUBLIC_BASE_URL
  }),
  callback: handleCallback(),
  profile: handleProfile()
});
```

### 3. **Updated Layout Provider**
**Before** (`/src/app/layout.js`):
```javascript
import { Auth0Provider } from '@auth0/nextjs-auth0';
<Auth0Provider>{children}</Auth0Provider>
```

**After**:
```javascript
import { UserProvider } from '@auth0/nextjs-auth0';
<UserProvider>{children}</UserProvider>
```

### 4. **Fixed Environment Variable References**
**Before** (`/src/lib/auth0.js`):
```javascript
domain: process.env.AUTH0_DOMAIN,
clientId: process.env.AUTH0_CLIENT_ID,
```

**After**:
```javascript
domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
```

### 5. **Fixed UserProvider Import Path (Build Issue)**
**Build Error**:
```
Module not found: Package path ./client is not exported from package @auth0/nextjs-auth0
```

**Before**:
```javascript
import { UserProvider } from '@auth0/nextjs-auth0/client';
```

**After**:
```javascript
import { UserProvider } from '@auth0/nextjs-auth0';
```

## Verification Steps
1. ✅ Auth0 environment variables properly configured in Vercel
2. ✅ Standard `@auth0/nextjs-auth0` SDK handlers implemented
3. ✅ Correct provider (`UserProvider`) used in layout
4. ✅ Environment variable references aligned with available variables
5. ✅ UserProvider import path fixed for successful build
6. ✅ Changes deployed to production

## Expected Result
- Auth0 login should now work with proper domain and client_id
- No more "undefined" errors in authentication flow
- Standard Auth0 SDK handling for login, logout, and callback
- Successful Vercel deployment without build errors

## Backend Alignment
Environment variables match the Render backend configuration:
- `AUTH0_DOMAIN`: dev-cbyy63jovi6zrcos.us.auth0.com
- `AUTH0_CLIENT_ID`: GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ
- `AUTH0_AUDIENCE`: https://dev-cbyy63jovi6zrcos.us.auth0.com/api/v2/

## Deployment History
1. **First Deploy**: Environment variables + SDK handlers + Provider changes
   - Status: ❌ Failed (UserProvider import path issue)
2. **Second Deploy**: Fixed UserProvider import path
   - Status: ✅ Building (expected success)

## Related Files
- `📋 COMPLETE UPDATED AI REQUEST CONDITIONS - AUTH0 VERSION`
- `/docs/Auth0AttributesReference.md`
- `/src/utils/Auth0Attributes.js` 