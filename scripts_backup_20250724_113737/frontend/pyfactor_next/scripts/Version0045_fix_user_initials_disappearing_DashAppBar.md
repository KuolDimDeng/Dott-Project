# Fix for Disappearing User Initials in DashAppBar

## Issue Description
When the dashboard renders for the first time, user initials appear correctly in the user avatar.
However, on subsequent re-renders or page navigation, the initials disappear and revert to a default 'U'.

## Root Causes
1. The `hasSetUserInitialsRef` flag prevents updating user initials after the first render
2. Network errors during re-renders cause authentication state to be temporarily lost
3. The `CognitoAttributes.js` utility has incorrect attribute name casing for `custom:tenant_ID`
4. User initials are not properly persisted in APP_CACHE for recovery after network errors

## Changes Made
1. Updated `CognitoAttributes.js` to use correct attribute name casing (`custom:tenant_ID`)
2. Modified the `hasSetUserInitialsRef` check to allow updates on re-render
3. Added proper caching in APP_CACHE for user initials
4. Enhanced the `generateUserInitialsFixed` function to handle more edge cases
5. Added initialization effect to properly set up user initials on mount

## Files Modified
- `/frontend/pyfactor_next/src/utils/CognitoAttributes.js`
- `/frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js`

## Verification
The fix ensures that:
1. User initials persist between renders even after network errors
2. The correct attribute name is used for tenant ID throughout the application
3. User data properly persists in APP_CACHE for recovery after network issues

## Date
2025-05-07
