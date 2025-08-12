# Version0009_FixUpdateUserAttributesMethod_tenantUtils

## Issue Description
This script addresses the error that occurs when trying to update tenant ID in Cognito:

```
Error: user.updateUserAttributes is not a function

src/utils/tenantUtils.js (231:16) @ updateTenantIdInCognito

  229 |   try {
  230 |     const user = await getCurrentUser();
> 231 |     await user.updateUserAttributes({
      |                ^
  232 |       'custom:tenantId': tenantId
  233 |     });
  234 |     await storeTenantId(tenantId);
```

The error occurs in the `updateTenantIdInCognito` function in `tenantUtils.js` when it tries to call `updateUserAttributes` as a method on the user object. This is because in AWS Amplify v6, `updateUserAttributes` is a standalone function that needs to be imported separately, not a method on the user object as it was in previous versions.

### Root Cause
In AWS Amplify v6, many methods that were previously available on objects returned by other functions have been moved to standalone functions that need to be imported directly. This is part of Amplify's move to a more modular architecture.

The code was trying to use the old pattern from previous Amplify versions where `updateUserAttributes` was a method on the user object. In v6, it's a standalone function that needs to be imported from 'aws-amplify/auth'.

### Fix Applied
The script updates the `updateTenantIdInCognito` function in `tenantUtils.js` to:

1. Import the `updateUserAttributes` function directly from 'aws-amplify/auth'
2. Call it with the correct parameter structure (using a `userAttributes` object)
3. Add additional logging for better debugging
4. Maintain the local cache update via `storeTenantId`

## Implementation Details

### Changes to tenantUtils.js
- Updated the `updateTenantIdInCognito` function to use the correct Amplify v6 API pattern
- Added proper dynamic import for the `updateUserAttributes` function
- Fixed the parameter structure to match the Amplify v6 requirements
- Added additional logging for better debugging

### Security Considerations
- No hardcoded tenant IDs are used
- The implementation maintains strict tenant isolation
- No sensitive information is exposed in the process
- All error handling is properly logged

## Execution
- **Date**: 2025-04-25
- **Status**: Pending
- **Backup Created**: Yes (timestamp format: YYYY-MM-DDTHH-MM-SS.SSSZ)

## Related Files
- `/frontend/pyfactor_next/src/utils/tenantUtils.js` - Modified to fix the `updateTenantIdInCognito` function
- `/frontend/pyfactor_next/src/context/TenantContext.js` - Uses the `updateTenantIdInCognito` function
- `/frontend/pyfactor_next/src/app/tenant/[tenantId]/TenantInitializer.js` - Indirectly calls this function via the TenantContext
