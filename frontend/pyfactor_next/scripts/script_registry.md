# Script Registry

This file tracks all scripts, their purposes, and execution status.

| Script ID | Version | Name | Purpose | Target Files | Status | Date |
|-----------|---------|------|---------|--------------|--------|------|
| 0001 | 1.0 | Dashboard Redirect Fix | Fix dashboard redirect after authentication by properly initializing AppCache | src/utils/appCache.js, src/utils/tenantUtils.js, src/app/auth/components/SignInForm.js | Created | 2025-04-20 |
| 0002 | 1.0 | Cognito Attributes Fix | Fix unauthorized attribute errors when updating Cognito user attributes | src/utils/amplifyResiliency.js, src/utils/safeAttributes.js | Created | 2025-04-20 |

## Script Details

### Script 0001: Dashboard Redirect Fix

**Problem**:  
After successful authentication, users are not being properly redirected to the dashboard due to storage constraints (no cookies, no localStorage) and improper initialization of AppCache.

**Solution**:  
- Initialize AppCache structure properly on all pages
- Add script to head for early AppCache initialization
- Define helper functions for AppCache access
- Extract and store tenant ID from URL
- Register page load listener to ensure AppCache initialization

**Implementation Notes**:  
This script should be included in the `_app.js` or root layout component to ensure it runs on every page. It uses in-memory storage exclusively (no cookies or localStorage) as per requirements.

**How to Apply**:  
Add the script import to your Next.js app's root component:

```javascript
// In src/app/layout.js or similar root component
import '../../scripts/Version0001_fix_dashboard_redirect_appCache.js';
```

**Testing**:  
After implementation, verify that:
1. Users can log in and are redirected to the dashboard
2. Tenant ID is properly extracted and stored
3. No errors in console related to localStorage or cookies

### Script 0002: Cognito Attributes Fix

**Problem**:  
When updating user attributes in Cognito, the app is trying to write to attributes that the user doesn't have permission to update, resulting in 400 errors with the message "A client attempted to write unauthorized attribute".

**Solution**:  
- Define a list of allowed attributes that users can actually update
- Create wrapper functions that filter attributes before sending to Cognito
- Implement a circuit breaker pattern to prevent repeated failed API calls
- Patch existing attribute update functions to use the safer versions
- Add proper error handling and logging

**Implementation Notes**:  
This script addresses the "A client attempted to write unauthorized attribute" errors by filtering out attributes that the user doesn't have permission to update before making the API call.

**How to Apply**:  
Add the script import to your Next.js app's root component:

```javascript
// In src/app/layout.js or similar root component
import '../../scripts/Version0002_fix_cognito_attributes_permissions.js';
```

**Testing**:  
After implementation, verify that:
1. No more "A client attempted to write unauthorized attribute" errors appear in the console
2. Legitimate attribute updates still work correctly
3. The circuit breaker prevents cascading failures 