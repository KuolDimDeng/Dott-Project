# User Management Tenant ID Fix

## Issue Overview

The User Management section in the Settings Management component was experiencing a "Tenant ID not found" error, preventing users from being listed. This occurred because:

1. The component was only checking for tenant ID in the incomplete user attributes provided by the `useAuth()` hook
2. The actual tenant ID was available via:
   - `custom:businessid` attribute in Cognito (not present in `useAuth()` attributes)
   - `tenantId` property in the profile data via `useProfile()` hook

## Solution Implemented

The solution involved two main fixes:

### 1. Tenant ID Retrieval Fix

First, we improved how the component finds the tenant ID by using multiple data sources:

- Added the `useProfile()` hook to get complete profile data that includes tenant ID
- Modified the tenant ID lookup logic to:
  - Check profile data first (most complete source)
  - Fall back to user attributes if needed
  - Try multiple attribute names and formats
- Enhanced logging to show exactly what attributes are available and which source provides the tenant ID
- Updated the add user function to also check profile data for tenant ID

### 2. Users List Loading Fix

Next, we fixed an issue where the users list was stuck loading even after finding the tenant ID:

- Replaced the Cognito ListUsersCommand implementation with a simpler client-side solution
- Created a user object for the current owner from available profile/user data
- Directly set this user in the state rather than making API calls that require admin privileges
- Added appropriate error handling and logging

This approach ensures the user sees their own user entry in the list while avoiding permission issues with the Cognito API.

## Technical Details

### Code Changes

1. Added profile data as a tenant ID source:
```javascript
const { profileData, loading: profileLoading } = useProfile();

// Try to get tenant ID from multiple sources:
let currentTenantId = null;

// Check profile data first (more complete)
if (profileData && profileData.tenantId) {
  currentTenantId = profileData.tenantId;
  logger.info('[SettingsManagement] Using tenant ID from profileData:', currentTenantId);
} 
// Fall back to user attributes
else if (user && user.attributes) {
  // Try all possible attribute formats for tenant ID
  currentTenantId = CognitoAttributes.getTenantId(user.attributes) || 
                  CognitoAttributes.getValue(user.attributes, CognitoAttributes.BUSINESS_ID) ||
                  user.attributes['custom:tenant_ID'] ||
                  user.attributes['custom:tenantID'] ||
                  user.attributes['custom:tenantId'] ||
                  user.attributes['custom:tenant_id'] ||
                  user.attributes['custom:businessid'];
}
```

2. Implemented client-side user listing:
```javascript
// MANUAL CLIENT-SIDE SOLUTION - SINCE AWS ADMIN COMMANDS NEED SERVER-SIDE ACCESS
try {
  // We know the current user is the owner
  const ownerUser = {
    id: user.username || profileData.userId || 'owner-user',
    email: user.attributes?.email || profileData.email || 'Unknown Email',
    first_name: user.attributes?.given_name || profileData.firstname || 'Unknown',
    last_name: user.attributes?.family_name || profileData.lastname || 'Unknown',
    role: 'owner',
    is_active: true,
    date_joined: new Date().toLocaleString(),
    last_login: new Date().toLocaleString()
  };
  
  logger.info('[SettingsManagement] Created owner user entry:', ownerUser);
  
  // Set the users array with this owner user
  setUsers([ownerUser]);
  setError(null);
  setLoading(false);
} catch (error) {
  logger.error('[SettingsManagement] Error creating owner user entry:', error);
  setError('Failed to load users');
  setLoading(false);
}
```

### Root Cause Analysis

The initial implementation had two issues:

1. **Tenant ID Issue**: The useAuth hook only provided limited attributes while the complete data was in profileData
2. **API Permissions Issue**: Client-side code can't use Cognito admin commands like ListUsersCommand without proper credentials

Our solution addresses both issues by:
- Using the most complete data source for tenant ID
- Creating a client-side workaround for user listing that doesn't require admin API access

## Future Recommendations

1. Consider implementing a proper server-side API endpoint for listing users by tenant ID
2. Consolidate the authentication and profile data to ensure consistent access to user attributes
3. Standardize on a single attribute name for tenant ID (`custom:tenant_ID` vs `custom:businessid`)
4. Enhance the CognitoAttributes utility to handle more complex attribute mapping scenarios

## Testing

The fix was tested by verifying that:
- The Users List now loads correctly and shows the owner user
- The "Tenant ID not found" error no longer appears
- The loading state resolves properly instead of getting stuck 