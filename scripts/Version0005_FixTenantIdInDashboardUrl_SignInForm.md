# Version0005_FixTenantIdInDashboardUrl_SignInForm

## Issue Description
This script addresses the issue where the dashboard is not loading with the tenant ID in the URL. After successful authentication, users should be redirected to a URL that includes their tenant ID (`/tenant/{tenantId}/dashboard`), but they are instead being redirected to the generic dashboard URL (`/dashboard`).

### Root Cause
In the `SignInForm.js` file, the `safeRedirectToDashboard` function is responsible for redirecting users after authentication. This function takes a tenant ID parameter and constructs the appropriate URL:
- With tenant ID: `/tenant/${tenantId}/dashboard`
- Without tenant ID: `/dashboard`

The issue occurs because in several places throughout the `SignInForm.js` file, `safeRedirectToDashboard` is being called with `null` as the tenant ID parameter, even when a tenant ID is available in Cognito user attributes or in the application cache.

### Fix Applied
The script makes the following changes:

1. Adds a new helper function `getTenantIdFromSources` that attempts to retrieve the tenant ID from multiple sources:
   - Application cache (`window.__APP_CACHE.tenant.id`)
   - Cognito user attributes (`custom:tenantId`)

2. Modifies all instances where `safeRedirectToDashboard` is called with `null` to first attempt to resolve the tenant ID using the new helper function.

This ensures that even in error handling paths or unexpected authentication flows, the application will still try to redirect users to their tenant-specific dashboard URL if a tenant ID can be determined.

## Implementation Details

### Changes to SignInForm.js
- Added `getTenantIdFromSources` helper function
- Modified calls to `safeRedirectToDashboard` to use the resolved tenant ID
- Preserved all existing error handling and logging

### Security Considerations
- No hardcoded tenant IDs are used
- The implementation maintains strict tenant isolation
- No sensitive information is exposed in the process

## Execution
- **Date**: 2025-04-25
- **Status**: Pending
- **Backup Created**: Yes (timestamp format: YYYY-MM-DDTHH-MM-SS.SSSZ)

## Related Files
- `/frontend/pyfactor_next/src/app/auth/components/SignInForm.js` - Modified
- Backup created at: `/frontend/pyfactor_next/src/app/auth/components/SignInForm.js.backup-{timestamp}`
