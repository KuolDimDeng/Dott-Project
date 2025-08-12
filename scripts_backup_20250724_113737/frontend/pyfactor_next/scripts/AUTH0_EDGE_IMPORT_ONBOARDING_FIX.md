# Auth0 Edge Import Fix in Onboarding Status Route

## Problem

The Vercel deployment was failing with the following error:
```
Failed to compile.

./src/app/api/onboarding/status/route.js
Module not found: Package path ./edge is not exported from package /vercel/path0/frontend/pyfactor_next/node_modules/@auth0/nextjs-auth0 (see exports field in /vercel/path0/frontend/pyfactor_next/node_modules/@auth0/nextjs-auth0/package.json)
```

This occurred because the onboarding status route was importing the Auth0 `getSession` function from the edge subpath, but that path is not exported from the Auth0 Next.js SDK package.

## Solution

We fixed the issue by replacing the edge-specific import:

```javascript
import { getSession } from '@auth0/nextjs-auth0/edge';
```

With the standard import:

```javascript
import { getSession } from '@auth0/nextjs-auth0';
```

The standard import works correctly in both edge and non-edge environments.

## Implementation

1. Created a backup of the onboarding status route file
2. Updated the import statement to use the standard path
3. Created this summary document
4. Updated the script registry
5. Committed and deployed the changes

## Benefits

- Fixes the build error in production
- Ensures compatibility with the Auth0 Next.js SDK
- Maintains the functionality of the onboarding status API
- Restores the authentication flow

## Deployment

The fix was deployed on June 6, 2025 via the Dott_Main_Dev_Deploy branch.
