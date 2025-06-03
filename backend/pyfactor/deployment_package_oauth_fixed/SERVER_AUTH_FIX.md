# Server-Side Authentication Fix

## Problem

The application is encountering the error "Auth UserPool not configured" in server components. This is because AWS Amplify v6 is designed primarily for client-side authentication and doesn't work properly in Next.js server components and API routes.

## Solution

We've implemented a server-side JWT verification utility that works without relying on Amplify. This approach:

1. Directly verifies JWTs from Cognito using the `jose` library
2. Works in server components, API routes, and middleware 
3. Extracts tokens from cookies or request headers
4. Provides a clean API with a withAuth wrapper for protected routes

## Implementation Details

1. Created `serverAuth.js` utility with:
   - `verifyToken()` - Verifies a JWT using Cognito's JWKS endpoint
   - `getServerUser()` - Extracts and verifies user from a request
   - `withAuth()` - Middleware for protected API routes
   - `decodeToken()` - Simple decoder for debugging

2. Updated the `/api/onboarding/verify-state/route.js` API route to use the new utilities

## How to Complete the Implementation

1. Run the `install_jose.sh` script to install the required dependencies:
   ```bash
   ./install_jose.sh
   ```

2. Update remaining API routes that use Amplify's `getCurrentUser()` to use our new `getServerUser()` from serverAuth
   - Look for imports like `import { getCurrentUser } from 'aws-amplify/auth'` in API routes
   - Replace with `import { getServerUser } from '@/utils/serverAuth'`
   - Update the code to use `getServerUser(request)` instead of `getCurrentUser()`

3. For protected API routes, consider using the withAuth wrapper:
   ```javascript
   import { withAuth } from '@/utils/serverAuth';

   async function handler(request) {
     // The user is now available as request.user
     return NextResponse.json({ data: "Protected data" });
   }

   export const GET = withAuth(handler);
   ```

4. For the final onboarding flow:
   - The authentication issues should be resolved
   - Make sure to uncomment the @tailwindcss/forms plugin in tailwind.config.js
   - Test the entire onboarding flow with the new authentication system

## Technical Background

1. **Why Amplify doesn't work server-side:** Amplify v6 configures auth at runtime in the browser and stores tokens in browser storage, which isn't available in server contexts.

2. **Middleware approach:** Our middleware adds the tokens as headers to API requests, which we can now verify server-side.

3. **JWKS verification:** We use JSON Web Key Sets (JWKS) from Cognito's well-known endpoint to cryptographically verify tokens without needing the client-side Amplify configuration.

## Testing

After implementing these changes, verify:

1. Auth flows work properly (login, signup, verification)
2. API routes correctly identify the authenticated user
3. Onboarding flow progresses through all steps without auth errors
4. Dashboard loads properly after onboarding completion