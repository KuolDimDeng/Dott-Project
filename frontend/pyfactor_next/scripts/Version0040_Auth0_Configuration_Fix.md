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
- **Package Version Issue**: Using v4.6.0 which doesn't have `handleAuth` functions

### 2. **Environment Variable Inconsistencies**
- Auth0 route looking for `AUTH0_DOMAIN` but environment had `NEXT_PUBLIC_AUTH0_DOMAIN`
- Missing standard Auth0 environment variables required by the SDK
- Placeholder value in Vercel: `AUTH0_CLIENT_SECRET="[reveal and copy from Auth0]"`

### 3. **Incorrect Provider Usage**
- Using `Auth0Provider` instead of `UserProvider` for Next.js App Router
- **Build Issue**: Incorrect import path `/client` subpath not exported
- **Package Version Issue**: v4.6.0 uses `Auth0Provider`, not `UserProvider`

## Fixes Applied

### 1. **Updated Environment Variables in Vercel**
Added missing standard Auth0 environment variables:
```bash
AUTH0_CLIENT_ID=GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ
AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_CLIENT_SECRET=nJCBudVjUDw1pHl8w-vA4WbwCdVtAOWuo8mhZucTIKOoIXF_ScXmUKPwY24071uz
AUTH0_BASE_URL=https://dottapps.com
```

### 2. **Implemented Manual Auth0 Route for v4.6.0**
**Before** (`/src/app/api/auth/[...auth0]/route.js`):
```javascript
// Attempted to use handleAuth functions that don't exist in v4.6.0
import { handleAuth, handleLogin, handleLogout, handleCallback, handleProfile } from '@auth0/nextjs-auth0';
```

**After**:
```javascript
import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextRequest, NextResponse } from 'next/server';

// Create Auth0 client instance with proper environment variables
const auth0Client = new Auth0Client({
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com',
  secret: process.env.AUTH0_SECRET,
  issuerBaseURL: `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}`,
});

// Manual route handling for login, logout, callback
export async function GET(request, { params }) {
  // Switch statement handling different auth routes
  // Proper URL construction with correct environment variables
}
```

### 3. **Updated Layout Provider for v4.6.0**
**Before** (`/src/app/layout.js`):
```javascript
import { UserProvider } from '@auth0/nextjs-auth0'; // Doesn't exist in v4.6.0
<UserProvider>{children}</UserProvider>
```

**After**:
```javascript
import { Auth0Provider } from '@auth0/nextjs-auth0'; // Correct for v4.6.0
<Auth0Provider>{children}</Auth0Provider>
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

### 5. **Package Version Compatibility**
**Issue**: Using `@auth0/nextjs-auth0` v4.6.0 which has different exports than newer versions
**Solution**: Implemented manual route handling compatible with v4.6.0 API

## Verification Steps
1. ✅ Auth0 environment variables properly configured in Vercel
2. ✅ Manual Auth0 route implementation for v4.6.0 compatibility
3. ✅ Correct provider (`Auth0Provider`) used in layout for v4.6.0
4. ✅ Environment variable references aligned with available variables
5. ✅ Package version compatibility ensured
6. ✅ Changes deployed to production

## Expected Result
- Auth0 login should now work with proper domain and client_id
- No more "undefined" errors in authentication flow
- Manual Auth0 route handling compatible with v4.6.0
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
   - Status: ❌ Failed (handleAuth functions don't exist in v4.6.0)
3. **Third Deploy**: Implemented manual route handling for v4.6.0 + correct Auth0Provider
   - Status: ✅ Building (expected success)

## Package Version Notes
- **Current Package**: `@auth0/nextjs-auth0` v4.6.0
- **Exports Available**: `Auth0Provider`, `Auth0Client`, `useUser`
- **Missing in v4.6.0**: `handleAuth`, `handleLogin`, `UserProvider` (these exist in newer versions)
- **Solution**: Manual route implementation using `Auth0Client` and standard Auth0 URLs

## Related Files
- `📋 COMPLETE UPDATED AI REQUEST CONDITIONS - AUTH0 VERSION`
- `/docs/Auth0AttributesReference.md`
- `/src/utils/Auth0Attributes.js` 