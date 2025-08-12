# Dashboard Onboarding Fix - Version 0003

**Date:** 2025-04-29
**Author:** System Administrator
**Issue:** Dashboard re-rendering after completing subscription with Free Plan

## Problem Description

After signing in and completing the subscription process by selecting the Free Plan, users experience an issue where the Dashboard keeps re-rendering continuously. The root cause is that the `custom:onboarding` attribute in Cognito is not being set to "complete", causing the dashboard to enter a redirect loop.

Logs show multiple "UserUnAuthenticatedException" errors when trying to access user attributes. The dashboard repeatedly loads with query parameters for subscription information, but the authentication process doesn't complete properly.

## Solution

We've created two scripts to address this issue:

1. **Frontend Fix (Version0003_fix_dashboard_cognito_onboarding.js)**:
   - Detects when user arrives at dashboard with subscription parameters
   - Sets the `custom:onboarding` attribute to "complete" in Cognito
   - Stores backup values in AppCache for resilience
   - Cleans up URL parameters after successful update
   - Handles edge cases like multiple re-renders

2. **Backend Fix (Version0003_fix_cognito_onboarding_attribute.py)**:
   - Provides server-side utilities to fix Cognito attributes
   - Can be run as a one-time fix for all users with missing `custom:onboarding` attributes
   - Implements error handling and logging for Cognito operations
   - Safely updates only allowed attributes

## Implementation Details

### Frontend Script

The frontend script (`Version0003_fix_dashboard_cognito_onboarding.js`) is injected into the dashboard page and detects when a user arrives from the subscription flow. It then:

1. Checks for URL parameters (`fromSubscription=true` and `plan=free|pro|etc`)
2. Uses AWS Amplify's `updateUserAttributes` to set `custom:onboarding` to `complete`
3. Adds a fallback mechanism using `safeUpdateUserAttributes` if available
4. Stores values in AppCache as a backup
5. Cleans up URL parameters using history API to prevent reloads
6. Implements an emergency fix for detecting infinite re-render loops

### Backend Script

The backend script (`Version0003_fix_cognito_onboarding_attribute.py`) provides utilities for server-side management of Cognito attributes, including:

1. Get/update Cognito user attributes with proper error handling
2. Scan and fix users with incomplete onboarding but who have completed subscription
3. Update both `custom:onboarding` and `custom:setupdone` attributes for consistency
4. Detailed logging for troubleshooting

## Usage

### Frontend Script Deployment

The frontend script should be deployed to the scripts directory and included in the dashboard page. It automatically runs when loaded.

```html
<script src="/scripts/Version0003_fix_dashboard_cognito_onboarding.js"></script>
```

### Backend Script Usage

Run the backend script manually to fix existing users:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
python Version0003_fix_cognito_onboarding_attribute.py
```

Make sure the following environment variables are set:
- `AWS_REGION` - AWS region where Cognito is deployed
- `COGNITO_USER_POOL_ID` - ID of the Cognito user pool

## Verification

After applying the fix:

1. The dashboard should load once and stay loaded without re-rendering
2. The user's Cognito attributes should show `custom:onboarding = complete`
3. The URL should not contain subscription query parameters after initial load
4. The user should have a valid session and be able to use the dashboard

## Technical Notes

- We're using AWS Amplify v6 functions for authentication and user management
- This fix follows the requirement to avoid cookies and local storage
- All data is stored either in Cognito attributes or AWS AppCache
- The fix is targeted specifically at the onboarding completion flow
- No UI or design changes were made

## Script Registry

| Script Name | Version | Purpose | Target Location | Status |
|-------------|---------|---------|----------------|--------|
| Version0003_fix_dashboard_cognito_onboarding.js | 1.0 | Fix dashboard re-rendering issue | /scripts/ | Active |
| Version0003_fix_cognito_onboarding_attribute.py | 1.0 | Fix onboarding attribute server-side | /backend/pyfactor/scripts/ | Active |

## Related Issues

- UserUnAuthenticatedException when trying to access user attributes
- Dashboard repeatedly loading with subscription parameters
- custom:onboarding attribute not being set to "complete" 