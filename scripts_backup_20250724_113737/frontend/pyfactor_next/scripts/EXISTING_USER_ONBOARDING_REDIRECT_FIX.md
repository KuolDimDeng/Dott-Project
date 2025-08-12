# Existing User Onboarding Redirect Fix

## Problem Description

Users with existing tenant IDs were being redirected to the onboarding flow instead of directly to their dashboard.

The issue was in the Auth0 callback logic, which was using a condition that would send users to onboarding if ANY of these conditions were true:
- User is marked as new
- User needs onboarding
- User has no tenant ID

This caused a problem where users with tenant IDs who were marked as "needsOnboarding" would be sent back through the onboarding flow unnecessarily.

## Solution

The fix modifies the Auth0 callback page to use a more precise condition for determining when to redirect to onboarding:

1. **Redirect to onboarding** only when the user has NO tenant ID AND (is a new user OR needs onboarding)
2. **Redirect to dashboard** for any user who has a tenant ID, regardless of their onboarding status

This ensures that existing users with tenant IDs always go straight to their dashboard.

## Implementation

The modified code now follows this logic:
```javascript
// For users without a tenant ID who are new or need onboarding
if ((!backendUser.tenantId && (backendUser.isNewUser || backendUser.needsOnboarding))) {
  // Redirect to onboarding
}

// For users with a tenant ID (existing users)
if (backendUser.tenantId) {
  // Redirect directly to dashboard
}
```

This fix helps prevent the issue where users get stuck in a loop of repeatedly being sent to onboarding even after they've completed it.

## Deployed Changes

- Modified `frontend/pyfactor_next/src/app/auth/callback/page.js` to improve onboarding redirection logic
- Created a backup of the original file
- Updated the script registry

Date: 2025-06-07
