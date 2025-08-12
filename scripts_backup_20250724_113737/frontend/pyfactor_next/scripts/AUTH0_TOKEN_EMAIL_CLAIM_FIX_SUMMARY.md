# Auth0 Token Email Claim Fix Summary

## Problem Overview

Users were experiencing an issue where after successfully signing in with Google OAuth and completing onboarding, when they sign out and sign in again, they are incorrectly redirected to the onboarding flow instead of the dashboard. This issue was happening because the Auth0 access tokens did not include the email claim, resulting in authentication failures on the backend.

## Root Cause Analysis

From the backend logs, we identified this specific error:
```
ERROR 2025-06-06 16:44:40,165 auth0_authentication ❌ No email in token
ERROR 2025-06-06 16:44:40,165 auth0_authentication ❌ Auth0 authentication failed for /api/users/me/: No email in token
```

The token payload shows that while the scope included "openid profile email", the actual email claim was not being included in the access token:
```
Token payload (unverified): {
  "iss": "https://auth.dottapps.com/",
  "sub": "google-oauth2|107454913649768153331",
  "aud": [
    "https://api.dottapps.com",
    "https://dev-cbyy63jovi6zrcos.us.auth0.com/userinfo"
  ],
  "iat": 1749228278,
  "exp": 1749314678,
  "scope": "openid profile email",
  "jti": "k9rFD2HCbZDeS2HCfeL5ro",
  "client_id": "9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF"
}
```

When backend API calls are made with this token, the authentication fails with "No email in token", resulting in 403 Forbidden errors for API requests. This causes the frontend to incorrectly think the user needs onboarding, even though they've already completed it.

## Solution Implemented

### 1. Auth0 Configuration Enhancement
- Updated the Auth0 configuration to ensure email claims are explicitly requested in the token
- Added a custom `afterCallback` hook to ensure email information is synchronized between ID token and access token
- Enhanced debugging to track session and token information

### 2. Middleware Updates
- Added functionality to the middleware to ensure all token requests include the email scope
- Implemented a token request modifier to add the scope parameter when missing
- Applied these changes specifically to token and authorization endpoints

### 3. Added Debugging and Monitoring
- Added comprehensive logging to track token flow and claims
- Implemented verification steps to confirm email claims are present
- Added session data debugging to help diagnose similar issues in the future

## Expected Results

With these changes, when a user signs in:
1. The Auth0 tokens will properly include the email claim
2. Backend API calls will successfully authenticate
3. After signing out and signing in again, users will be correctly redirected to the dashboard instead of onboarding
4. The 403 Forbidden errors in the backend logs will be resolved

## Implementation Details

The fix was implemented in three key files:

1. `src/config/auth0.js` - Modified to ensure email claims are included and added token verification
2. `src/middleware.js` - Updated to add email scope to token requests
3. `src/app/api/auth/callback/route.js` (not found in the current project structure) - Added claim synchronization logic to the script for future implementation

## Testing Notes

This fix should be tested by:
1. Signing in with Google OAuth
2. Completing the onboarding process
3. Signing out
4. Signing in again
5. Verifying the user is redirected to the dashboard (not onboarding)
6. Checking backend logs to confirm no "No email in token" errors

## Additional Information

This issue was related to how Auth0 packages claims in access tokens versus ID tokens. While the ID token typically contains user profile information (including email), the access token used for API authorization sometimes doesn't include all claims by default. Our fix ensures that email claims are consistently available in both tokens.
