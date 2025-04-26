# User Role Case Sensitivity Fix Documentation

## Overview

This document describes an issue with user role checking in the menu privileges system that was causing the main menu to not display properly for users with the "owner" role due to case sensitivity problems.

## Issue Description

Users with `custom:userrole` set to "owner" were experiencing an issue where their main menu list items were not visible. This was due to several related problems:

1. The user role checking was case-sensitive, meaning "owner" would work but other cases like "OWNER" or "Owner" might not
2. The AuthContext was not including the `custom:userrole` attribute in the essential user attributes passed to components
3. The role checking was not using a consistent source for retrieving the user role

## Solution Implemented

We implemented a comprehensive fix with the following components:

1. **Version0002_fix_user_role_case_sensitivity.js Script**
   - Makes role checking case-insensitive by converting to lowercase
   - Checks multiple sources for user role with a fallback strategy
   - Properly sets the isBusinessOwner cache flag for owner users
   - Adds event listeners to fix menu on navigation and auth changes

2. **AuthContext.js Update**
   - Modified `extractEssentialUserData` function to include `custom:userrole` in essential attributes
   - This ensures role information is consistently available across the application

3. **DashboardClientLayout.js Update**
   - Added import for the fix script to ensure it runs when dashboard loads

## Technical Details

### Role Detection Strategy

The fix uses a multi-layered approach to detect user roles:

1. First tries to get role from `window.__APP_CACHE?.auth?.userAttributes`
2. Falls back to checking `cognitoAttributes` in the app cache
3. Further falls back to `user` object in the app cache

### Menu Visibility Mechanism

For users identified as owners:
- Sets `isBusinessOwner` flag to `true` in app cache
- Dispatches a `userMenuPrivilegesLoaded` event with `menuPrivileges: 'ALL'`
- If needed, manually shows any hidden menu items through DOM manipulation

## Implementation Timeline

- **Date Implemented**: 2024-05-20
- **Script Version**: 1.0.0

## How It Works

1. When a user loads the dashboard, the fix script automatically runs
2. It checks if the user has an "owner" role (case-insensitive) 
3. If the user is an owner, it ensures they have full menu access
4. The script listens for navigation events to reapply the fix if needed

## Testing

To verify the fix is working:
1. Log in with a user that has `custom:userrole` set to "owner" (any case)
2. Confirm that all menu items are visible
3. Check browser console for logs showing "[UserRoleFix]" messages indicating the fix was applied

## References

- Related Script: `frontend/pyfactor_next/scripts/Version0002_fix_user_role_case_sensitivity.js`
- Modified Files: 
  - `frontend/pyfactor_next/src/contexts/AuthContext.js`
  - `frontend/pyfactor_next/src/app/dashboard/DashboardClientLayout.js`
- Script Registry: `frontend/pyfactor_next/scripts/script_registry.md` 