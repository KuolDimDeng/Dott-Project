# User Profile Authentication Fix

## Issue Description
Users were unable to see their business name and initials in the dashboard interface.
The issue was caused by an authentication error (401 Unauthorized) when fetching the user profile from the API,
and inadequate fallback mechanisms to retrieve this information from Cognito attributes.

## Fix Details
This fix addresses several aspects of the authentication and data retrieval process:

1. **Enhanced API Authentication**: 
   - Added proper bearer token authentication to profile API requests
   - Included X-Tenant-ID header in requests for better context
   - Added request IDs for improved debugging

2. **Improved Cognito Fallbacks**:
   - Better handling of direct Cognito attribute access when API fails
   - More comprehensive attribute mapping for business name and initials

3. **Enhanced Caching**:
   - Improved AppCache usage to persist user information
   - Added a refreshAuthCache utility to update tokens and key user data
   - Better coordination between memory cache and AppCache

4. **Robust Error Handling**:
   - Added detailed logging for authentication failures
   - Implemented graceful fallbacks when authentication fails
   - Preserved user context across authentication errors

## Modified Files
- `frontend/pyfactor_next/src/contexts/UserProfileContext.js` - Enhanced authentication for profile API requests
- `frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js` - Fixed profile fetch authentication
- `frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js` - Improved business name and initials retrieval
- `frontend/pyfactor_next/src/services/userService.js` - Enhanced auth token handling for profile API
- `frontend/pyfactor_next/src/utils/appCache.js` - Added utility to refresh auth-related cache items

## References
- Related to the previous onboarding fix (Version0003_fix_cognito_onboarding_attribute.py)
- Implements proper tenant isolation for user profile data

## Execution
Run this script with Node.js from the project root directory.

## Date
2025-04-29
