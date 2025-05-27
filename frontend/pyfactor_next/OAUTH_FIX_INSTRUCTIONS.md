# OAuth Configuration Fix Instructions

## Problem
Google Sign-In was showing the error: `oauth param not configured`

## Root Cause
The OAuth environment variables were not being properly loaded by Next.js during development.

## Solutions Implemented

### Solution 1: Use Development Script (Recommended)
Run the development server with OAuth environment variables pre-configured:

```bash
npm run dev:oauth
```

This script automatically sets all required OAuth environment variables and starts the development server.

### Solution 2: Manual Environment Setup
If you prefer to set environment variables manually:

```bash
# Source the environment script
source scripts/set-oauth-env.sh

# Then run the development server
npm run dev
```

### Solution 3: Direct Environment Variables
Set the environment variables directly in your terminal:

```bash
export NEXT_PUBLIC_COGNITO_DOMAIN=issunc
export NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=http://localhost:3000/auth/callback
export NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=http://localhost:3000/auth/signin
export NEXT_PUBLIC_OAUTH_SCOPES=email,profile,openid

npm run dev
```

## Environment Variables Required

For **Local Development**:
- `NEXT_PUBLIC_COGNITO_DOMAIN=issunc`
- `NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=http://localhost:3000/auth/callback`
- `NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=http://localhost:3000/auth/signin`
- `NEXT_PUBLIC_OAUTH_SCOPES=email,profile,openid`

For **Production** (already configured in production.env):
- `NEXT_PUBLIC_COGNITO_DOMAIN=issunc`
- `NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/callback`
- `NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/signin`
- `NEXT_PUBLIC_OAUTH_SCOPES=email,profile,openid`

## Files Modified

1. **src/config/amplifyUnified.js**
   - Added environment variable debugging
   - Enhanced OAuth configuration with providers array
   - Improved scopes parsing with trim()

2. **next.config.js**
   - Added OAuth environment variables to env section

3. **scripts/dev-with-oauth.sh**
   - New script that sets OAuth env vars and starts dev server

4. **scripts/set-oauth-env.sh**
   - Script to set OAuth environment variables

5. **package.json**
   - Added `dev:oauth` script

## Testing

1. Start the development server with OAuth:
   ```bash
   npm run dev:oauth
   ```

2. Open browser console and look for debug logs:
   ```
   [AmplifyUnified] Environment Variables Debug: {...}
   [AmplifyUnified] OAuth Configuration: {...}
   ```

3. Test Google Sign-In button - should no longer show "oauth param not configured" error

## Troubleshooting

If you still see the error:

1. **Check Environment Variables**: Look for the debug logs in browser console to verify environment variables are loaded

2. **Restart Development Server**: Stop and restart the development server after setting environment variables

3. **Clear Browser Cache**: Clear browser cache and cookies for localhost:3000

4. **Check Network Tab**: Look for OAuth-related network requests in browser dev tools

## Production Deployment

For production, the OAuth environment variables are already configured in `production.env`. Make sure this file is properly loaded during deployment.

## AWS Cognito Configuration

The OAuth configuration points to:
- **Cognito Domain**: `issunc.auth.us-east-1.amazoncognito.com`
- **Google Provider**: Configured in AWS Cognito User Pool
- **Scopes**: email, profile, openid
- **Response Type**: code (Authorization Code flow)

## Next Steps

1. Test Google Sign-In functionality
2. Verify OAuth callback handling at `/auth/callback`
3. Test sign-out flow
4. Monitor for any additional OAuth-related errors 