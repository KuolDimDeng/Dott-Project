# Fix for Onboarding to Dashboard Redirect Issue

## Issue Description
After completing onboarding, users were being redirected to the dashboard but then immediately redirected back to the sign-in page.

## Root Cause
1. The `/api/auth/profile` endpoint was not finding the new session cookies (`sid` and `session_token`) because it was checking for old format cookies first
2. The dashboard page was receiving `null` from the profile API and treating it as an authentication error
3. The `/api/auth/session-verify` endpoint was missing

## Fixes Applied

### 1. Updated Profile API (`/api/auth/profile/route.js`)
- Added check for new session cookies (`sid` and `session_token`) before checking old ones
- If new session cookies are found, fetch session data from backend
- Added better handling for users who just completed onboarding

### 2. Created Session Verify Endpoint (`/api/auth/session-verify/route.js`)
- New endpoint to quickly verify if a user has a valid session
- Checks both new and old session cookie formats
- Used by dashboard to verify session after onboarding

### 3. Updated Dashboard Page (`/app/[tenantId]/dashboard/page.js`)
- Added null check for profile data response
- Special handling for users who just completed onboarding
- Retry logic if session is not immediately available

### 4. Cleaned Up Duplicate Files
- Archived old authFlowHandler versions (v1, v2, and authFlowBackendFirst)
- Archived old session.js file
- Moved all backup files to _backups directory

## How It Works Now

1. After onboarding completion, cookies are set:
   - `sid` and `session_token` - New session management cookies
   - `onboarding_just_completed` - Temporary marker (5 minutes)
   - `onboardingCompleted` - Permanent marker
   - `user_tenant_id` - Tenant ID for the user

2. User is redirected to dashboard using `window.location.href`

3. Dashboard checks authentication:
   - Calls `/api/auth/profile`
   - Profile API checks for new session cookies first
   - If found, fetches session from backend
   - Returns user data with onboarding status

4. If profile returns null (edge case):
   - Dashboard checks for onboarding completion cookies
   - If found, waits 2 seconds for session to propagate
   - Retries profile fetch
   - If still fails, redirects to sign-in

## Testing
1. Complete onboarding flow
2. Verify redirect to dashboard works
3. Check that you stay on dashboard (no redirect to sign-in)
4. Refresh the page to ensure session persists

## Related Files
- `/src/app/api/auth/profile/route.js`
- `/src/app/api/auth/session-verify/route.js`
- `/src/app/[tenantId]/dashboard/page.js`
- `/src/app/api/onboarding/complete-all/route.js`
- `/src/components/Onboarding/OnboardingFlow.v2.jsx`