# User Profile API Authentication Fix - EmployeeManagement Component

## Issue Description

The EmployeeManagement component was experiencing a 401 Unauthorized error when attempting to fetch user profile data from the API endpoint. The specific error occurred at:

```
GET https://localhost:3000/api/user/profile?tenantId=f25a8e7f-2b43-5798-ae3d-51d803089261 [HTTP/1.1 401 Unauthorized]
```

### Problem Details:

1. The component was making a fetch request to the `/api/user/profile` endpoint without including proper authentication credentials
2. Headers were missing the required Authorization token
3. The API request was failing with a 401 Unauthorized status
4. While the component had fallback mechanisms to Cognito attributes and AppCache, this resulted in unnecessary API calls and error logs

### Impact:

- Extra network requests that failed with 401 errors
- Unnecessary error logging in the console
- Potential performance impact due to failed requests and fallbacks
- Increased complexity in debugging authentication issues

## Solution Implemented

The fix implements the following improvements:

1. **Add Authentication Headers**: Updated the fetch request to include the proper Authorization header with the token retrieved from browser storage.

```javascript
const response = await fetch(url, { 
  headers: { 
    'Cache-Control': 'no-cache',
    'X-Dashboard-Route': 'true',
    'Authorization': 'Bearer ' + (localStorage.getItem('idToken') || sessionStorage.getItem('idToken') || ''),
    'X-Tenant-ID': tenantId || ''
  },
  credentials: 'include'
});
```

2. **Enhanced Error Handling**: Improved error handling for API errors, with specific handling for 401 authentication errors.

```javascript
if (apiError.response) {
  console.error('API Error Status:', apiError.response.status);
  console.error('API Error Headers:', apiError.response.headers);
} 
// Check specifically for auth errors to handle them better
if (apiError.status === 401 || (apiError.response && apiError.response.status === 401)) {
  console.warn('[UserProfile] Authentication error (401), will try Cognito fallback');
}
```

3. **Improved Cognito Fallback**: Made the Cognito attribute fallback more robust by supporting multiple authentication methods.

```javascript
// Handle multiple possible auth methods in a safer way
let userAttributes = null;

// First try the global fetchUserAttributes if available
if (typeof window.fetchUserAttributes === 'function') {
  try {
    console.log('[UserProfile] Using window.fetchUserAttributes');
    userAttributes = await window.fetchUserAttributes();
  } catch (error) {
    console.warn('[UserProfile] Error with fetchUserAttributes:', error.message);
  }
}

// Try Auth from AWS Amplify if available and we didn't get attributes yet
if (!userAttributes && window.Auth && typeof window.Auth.currentAuthenticatedUser === 'function') {
  try {
    console.log('[UserProfile] Using Auth.currentAuthenticatedUser');
    const user = await window.Auth.currentAuthenticatedUser();
    userAttributes = user.attributes;
  } catch (error) {
    console.warn('[UserProfile] Error with Auth.currentAuthenticatedUser:', error.message);
  }
}
```

## Implementation Notes

The fix was implemented in two scripts:

1. `Version0002_Fix_UserProfile_Auth_EmployeeManagement.js` - Initial fix for 401 Unauthorized error
   - Added authentication headers to fetch requests
   - Enhanced error handling
   - Added initial Cognito fallback mechanism

2. `Version0003_Fix_Auth_Method_EmployeeManagement.js` - Fix for "No authentication method available" error
   - Fixed a new error introduced by our first fix
   - Implemented multiple safe fallbacks for authentication methods
   - Made the fallback mechanism more resilient by avoiding error throws
   - Improved cross-browser compatibility by checking method existence before calling

Both scripts:
   - Create backups of the original file
   - Update the script registry with details of the fix
   - Use ES modules syntax to align with the project requirements

## Testing

This fix should be tested by:

1. Accessing the Employee Management section in the dashboard
2. Verifying no 401 Unauthorized errors appear in the console
3. Confirming no "No authentication method available" errors appear in the console
4. Confirming that user profile data is successfully retrieved
5. Testing the fallback mechanisms by intentionally invalidating the auth token

## Related Components

The issue may exist in other components that make similar API calls. Consider examining:

1. Other dashboard components that fetch user profile data
2. Components that directly call the profile API
3. Any data fetching mechanisms that might need proper authentication headers

## Version History

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-04-26 | 1.0 | Fixed 401 Unauthorized error in user profile API calls | AI Assistant |
| 2025-04-26 | 1.1 | Fixed "No authentication method available" error in Cognito fallback | AI Assistant | 