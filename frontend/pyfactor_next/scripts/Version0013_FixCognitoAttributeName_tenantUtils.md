# Version0013_FixCognitoAttributeName_tenantUtils

## Issue Description
This script addresses the Cognito attribute permission error in the dashboard:

```
Error updating tenant ID in Cognito: NotAuthorizedException: A client attempted to write unauthorized attribute
```

The error occurs because the application is trying to update `custom:tenantId` in Cognito, but the correct attribute name in the Cognito user pool is `custom:tenant_ID` (with different capitalization and an underscore).

### Root Cause
1. The `updateTenantIdInCognito` function is using the incorrect attribute name (`custom:tenantId`)
2. Cognito is rejecting the update because this attribute either doesn't exist or the application doesn't have permission to write to it
3. This causes the tenant initialization process to fail, although the application continues to function with the cached tenant ID

### Fix Applied
The script makes the following changes:

1. Updates the attribute name in `updateTenantIdInCognito` function from `custom:tenantId` to `custom:tenant_ID`
2. Updates the attribute retrieval in `getTenantId` and `getTenantIdFromCognito` functions to check both attribute names
3. Modifies the error handling in `updateTenantIdInCognito` to continue even if the Cognito update fails
   - This ensures the application will still function by using the cached tenant ID
   - The error is logged but not thrown, preventing it from breaking the application flow

## Implementation Details

### Changes to tenantUtils.js
- Updated the attribute name in the Cognito API calls
- Added fallback checks for both attribute name formats
- Improved error handling to make the application more resilient

### Technical Approach
- Made the application more flexible by checking multiple attribute name formats
- Ensured backward compatibility with existing data
- Added graceful degradation when Cognito updates fail

## Execution
- **Date**: 2025-04-25
- **Status**: Pending
- **Backup Created**: Yes (timestamp format: YYYY-MM-DDTHH-MM-SS.SSSZ)

## Related Files
- `/frontend/pyfactor_next/src/utils/tenantUtils.js` - Modified to fix Cognito attribute name
