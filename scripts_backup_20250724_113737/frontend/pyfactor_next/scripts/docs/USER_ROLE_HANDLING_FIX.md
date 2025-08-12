# User Role Handling Fix

## Issue Description

Users with the role "owner" were experiencing issues with permissions in the Settings Management page, specifically when trying to add users. The error "Only owners can add users" appeared despite having the correct owner role. 

The root issues were:

1. **Case sensitivity in role comparisons**: The isOwner function in SettingsManagement.js was using a strict case-sensitive comparison (`user.attributes['custom:userrole'] === 'owner'`), so users with "Owner" (capitalized) wouldn't pass the check.

2. **Inconsistent role storage**: Roles were stored with inconsistent case across the application (sometimes "owner", sometimes "Owner").

3. **Lack of role normalization**: The application wasn't normalizing role values before storing or comparing them.

4. **Missing debugging and error handling**: There was insufficient logging to diagnose role-related issues.

## Fix Implementation

We implemented a comprehensive fix with multiple components:

### 1. Role Helper Utility

Created a new utility file `/frontend/pyfactor_next/src/utils/roleHelper.js` with consistent functions for role handling:

```javascript
/**
 * Check if a role is an owner role (case-insensitive)
 */
export function isOwnerRole(role) {
  if (!role) return false;
  return role.toLowerCase() === 'owner';
}

/**
 * Normalize a role to lowercase for consistent storage
 */
export function normalizeRole(role) {
  if (!role) return '';
  return role.toLowerCase();
}

/**
 * Get user role from user object with fallbacks
 */
export function getUserRole(user) {
  if (!user) return null;
  
  // Try to get from Cognito attributes
  if (user.attributes && user.attributes['custom:userrole']) {
    return normalizeRole(user.attributes['custom:userrole']);
  }
  
  // Try to get from role property
  if (user.role) {
    return normalizeRole(user.role);
  }
  
  return null;
}

/**
 * Check if user has owner permissions
 */
export function isUserOwner(user) {
  const role = getUserRole(user);
  return isOwnerRole(role);
}
```

### 2. AuthContext Normalization

Modified the AuthContext to normalize user roles to lowercase:

```javascript
// Normalize role to lowercase for consistency
const processAttributes = (attributes) => {
  if (attributes && attributes['custom:userrole']) {
    attributes['custom:userrole'] = attributes['custom:userrole'].toLowerCase();
    console.log('[AuthContext] Normalized user role to:', attributes['custom:userrole']);
  }
  return attributes;
};

// Apply normalization to user attributes if they exist
if (user && user.attributes) {
  user.attributes = processAttributes(user.attributes);
}
```

### 3. Updated isOwner Function

Modified the isOwner function in SettingsManagement.js to use the roleHelper utility:

```javascript
const isOwner = useCallback(() => {
  // Use the roleHelper utility for consistent role checking
  const isOwner = roleHelper.isUserOwner(user);
  console.log('[SettingsManagement] isOwner check result:', isOwner, 'User:', user?.attributes?.['custom:userrole']);
  return isOwner;
}, [user]);
```

### 4. Enhanced Debugging 

Added debug utilities and detailed logging:

```javascript
// Debug utility in debugUtils.js
export function debugUserRole() {
  console.group('🔍 User Role Debug Information');
  const userInfo = getAllUserInfo();
  console.log('User Info:', userInfo);
  console.groupEnd();
  
  return userInfo;
}

// Debug logging in SettingsManagement.js
useEffect(() => {
  // Call debug function when component mounts
  console.group('🛠️ SettingsManagement Debug Info');
  console.log('User object:', user);
  console.log('Role from roleHelper:', roleHelper.getUserRole(user));
  console.log('Is owner from roleHelper:', roleHelper.isUserOwner(user));
  debugUserRole();
  console.groupEnd();
  
  fetchEmployees();
}, [fetchEmployees, user, roleHelper]);
```

### 5. Fixed Runtime Error

Fixed a runtime error caused by referencing variables before they were initialized:

```
Error: can't access lexical declaration 'user' before initialization
```

The fix involved:
- Moving the debug useEffect code after the user declaration
- Fixing dependency array references to ensure variables are used after declaration
- Ensuring proper ordering of variable declarations and references in the component

## Files Modified

1. `/frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js` - Updated isOwner function and added debugging
2. `/frontend/pyfactor_next/src/context/AuthContext.js` - Added role normalization
3. `/frontend/pyfactor_next/src/utils/roleHelper.js` - New utility for consistent role handling
4. `/frontend/pyfactor_next/src/utils/debugUtils.js` - New debugging utilities

## How to Test

1. Log in as a user with any case variation of "owner" role (e.g., "owner", "Owner", "OWNER")
2. Navigate to the Settings Management page
3. Open the browser console to see the debug logs 
4. Try to add a new user
5. Verify that you no longer receive the error message "Only owners can add users"

## Related Scripts

- `Version0010_fix_owner_role_check_in_settings.js` - Initial fix for case sensitivity in isOwner function
- `Version0010_fix_owner_role_check_in_settings_v2.js` - Enhanced version with more debugging
- `Version0011_fix_user_role_storage_and_access.js` - Comprehensive fix for role handling across the application
- `Version0012_fix_user_reference_error.js` - Fix for runtime error with variable declaration ordering 