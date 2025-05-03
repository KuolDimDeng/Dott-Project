# DashAppBar User Data Fix

## Issue Description
The DashAppBar component is not displaying the business name or user initials in the user icon. This is caused by issues with retrieving data from the appCache utility and Cognito user attributes. The console logs show:

```
[DashAppBar] Component initialized with props 
Object { hasUserAttrs: false, hasUserData: false, hasProfileData: false }

[DashAppBar] Business name sources: 
Object { cognitoName: undefined, userDataName: undefined, profileDataName: undefined, cachedName: undefined, current: null }
```

The issue is related to issues with JSON parsing in the appCache utility, which was previously addressed with a fix to the appCache.js file. However, additional resilience is needed in the components that consume the cached data.

## Changes Implemented

### 1. Enhanced Error Handling in User Session Hook

The `getUserAttributesFromCognito` function in `useSession.js` was updated to:

- Add validation of cached attributes structure to prevent propagating corrupted data
- Check for and clean up corrupted cache entries
- Implement tenant-specific caching for better isolation
- Store data in multiple locations for resilience

### 2. Improved Business Name Retrieval in DashAppBar

The DashAppBar component was updated to:

- Extract business name from URL parameters (useful during tenant switching)
- Extract tenant ID from URL path when not available from other sources
- Use tenant-specific cache entries to prevent cross-tenant data issues
- Add additional fallback mechanisms to find business name from multiple sources
- Improve error handling around APP_CACHE access

### 3. Enhanced User Initials Generation

The initials generation functionality was improved to:

- Add comprehensive error handling for all input types
- Provide multiple fallback mechanisms for generating initials
- Handle corrupted name/email data gracefully
- Return a default value as absolute last resort

### 4. Additional Debugging Information

Added explicit debugging logs that show:
- Component initialization status
- Data source availability
- Business name source discovery

## Affected Files

1. `/frontend/pyfactor_next/src/hooks/useSession.js`
2. `/frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js`

## Testing Considerations

After applying this fix, verify that:

1. The business name appears correctly in the app bar for authenticated users
2. User initials appear correctly in the user icon circle
3. The data persists correctly across page reloads
4. The business name changes appropriately when switching tenants
5. No errors appear in the console related to appCache or user data retrieval

## Version History

- v1.0 (2025-04-29): Initial implementation of DashAppBar user data fix 