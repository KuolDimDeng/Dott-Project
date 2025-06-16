# Session Cookie Persistence Fix

## Issue
After clearing browser cache and signing in, users were still being redirected to onboarding instead of the dashboard. The session cookie was not persisting between requests.

## Root Cause
1. Cookie domain was undefined, causing cookies not to persist in production
2. The `updateAuth0Session` function was incorrectly setting `needsOnboarding` based on payment status
3. Session state was not syncing properly with backend after onboarding completion

## Fixes Applied

### 1. Fixed Cookie Domain Settings
**File**: `/src/app/api/auth/session/route.js`
- Changed cookie domain from undefined to `.dottapps.com` for production
- This ensures cookies persist across page reloads and subdomain requests

```javascript
// Before:
domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
// Was commented out

// After:
domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
// Now active
```

### 2. Fixed Onboarding Status Logic
**File**: `/src/app/api/onboarding/complete-all/route.js`
- Updated `updateAuth0Session` to always set `needsOnboarding: false` when onboarding is complete
- Removed incorrect logic that set `needsOnboarding` based on payment status
- Added backend session sync after onboarding completion

```javascript
// Before:
needsOnboarding: onboardingData.paymentPending ? true : false,

// After:
needsOnboarding: false, // Always false when onboarding is complete
```

### 3. Enhanced Session Sync Endpoint
**File**: `/src/app/api/auth/sync-session/route.js`
- Added `forceBackendSync` option to fetch latest state from backend
- Ensures frontend session matches backend state
- Properly handles all session field variations

### 4. Added Backend Session Update
**File**: `/src/app/api/onboarding/complete-all/route.js`
- Added explicit backend session update after onboarding
- Calls `/api/auth/update-session/` to ensure backend knows onboarding is complete

## Testing Steps

1. Clear browser cache and cookies
2. Sign in with Auth0
3. Complete onboarding flow
4. Verify you're redirected to dashboard (not back to onboarding)
5. Refresh the page - should stay on dashboard
6. Clear cache again and sign in - should go directly to dashboard

## Backend Fix Script

To fix users already affected by this issue, run on the backend:

```python
from scripts.fix_onboarding_completion_status import fix_all_users_with_tenants
fix_all_users_with_tenants()
```

This will:
- Update OnboardingProgress.onboarding_status = 'complete'
- Set OnboardingProgress.setup_completed = True
- Fix boolean field corruption
- Clear affected user sessions

## Verification

Check if the fix is working:
1. Browser DevTools > Application > Cookies
2. Look for `dott_auth_session` cookie
3. Verify domain is `.dottapps.com` in production
4. Check `onboarding_status` cookie shows `onboardingCompleted: true`

## Summary

The fix ensures:
1. Cookies persist properly with correct domain settings
2. Onboarding status is always set correctly when completed
3. Frontend and backend session states stay synchronized
4. Users who complete onboarding go directly to dashboard