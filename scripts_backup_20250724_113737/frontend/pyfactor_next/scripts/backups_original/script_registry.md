# Frontend Script Registry

## Version0001_fix_onboarding_redirect_issue.js
- **Date:** 2025-04-28T19:00:03.792Z
- **Purpose:** Fix issue with redirection to onboarding business info page after sign-in
- **Status:** Executed
- **Files Modified:**
  - frontend/pyfactor_next/src/app/onboarding/layout.js
  - frontend/pyfactor_next/src/app/auth/components/SignInForm.js
- **Summary of Changes:**
  - Added fallback mechanism to retrieve tokens from sessionStorage
  - Made onboarding routes public to prevent redirect loops
  - Ensured consistent token storage across different storage mechanisms
  - Added additional logging for better troubleshooting

## Version0002_fix_subscription_redirect_issue.js
- **Date:** 2025-04-28T19:15:00.484Z
- **Purpose:** Fix issue with redirection from business info page to subscription page
- **Status:** Executed
- **Files Modified:**
  - frontend/pyfactor_next/src/app/onboarding/business-info/page.js
- **Summary of Changes:**
  - Enhanced redirection mechanism in business-info page
  - Added timing delay to ensure state updates before navigation
  - Implemented fallback navigation method using window.location for reliability
  - Added additional debugging parameters to track redirection source

## Version0003_fix_subscription_page_loading.js
- **Date:** 2025-04-28T20:23:05.100Z
- **Purpose:** Fix issue with subscription page not loading properly after redirection
- **Status:** Executed
- **Files Modified:**
  - frontend/pyfactor_next/src/app/onboarding/subscription/page.js
- **Summary of Changes:**
  - Enhanced initializeSubscription function with better error handling
  - Improved business info retrieval with multi-source fallbacks
  - Added proper error state UI with retry options
  - Enhanced authentication flow with token fallback mechanism
  - Added support for URL parameters from business info page

## Version0003_fix_user_initials_DashAppBar.js

**Description**: Fixes the user initials display in the DashAppBar component by properly retrieving and displaying user initials from Cognito attributes.

**Date**: 2025-04-28  
**Updated**: 2025-04-29 (v1.1.0) - Enhanced with detailed debug logging

**Target Files**:
- src/app/dashboard/components/DashAppBar.js
- src/utils/safeAttributes.js

**Changes**:
- Ensures user initials are correctly retrieved from Cognito attributes
- Properly stores user initials in AppCache with tenant-specific keys
- Updates UI with correct user initials dynamically
- Handles various attribute formats and email-based initial generation
- Uses mutation observer to update initials when DOM changes
- Added comprehensive debug logging to verify critical data retrieval (v1.1.0)
- Added verification steps to confirm the fix was properly applied (v1.1.0)
- Added warning messages for missing critical user data (v1.1.0)

**Status**: Ready for deployment

**Dependencies**:
- Amplify v6
- AWS AppCache
- Tenant isolation

**Author**: Project Team
