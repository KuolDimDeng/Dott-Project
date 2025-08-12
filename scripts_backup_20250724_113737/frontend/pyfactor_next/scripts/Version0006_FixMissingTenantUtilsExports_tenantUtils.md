# Version0006_FixMissingTenantUtilsExports_tenantUtils

## Issue Description
This script addresses multiple import errors in the dashboard components due to missing function exports in the `tenantUtils.js` file and an incorrect cache import in the `userRoleUtils.js` file.

### Error Messages
```
Attempted import error: 'getSecureTenantId' is not exported from '@/utils/tenantUtils'
Attempted import error: 'validateTenantIdFormat' is not exported from '@/utils/tenantUtils'
Attempted import error: 'getSchemaName' is not exported from '@/utils/tenantUtils'
Attempted import error: 'getTenantHeaders' is not exported from '@/utils/tenantUtils'
Attempted import error: 'extractTenantId' is not exported from '@/utils/tenantUtils'
Attempted import error: 'cache' is not exported from 'aws-amplify/utils'
```

### Root Cause
1. The `tenantUtils.js` file is missing several function exports that are being imported by various dashboard components:
   - `getSecureTenantId`
   - `validateTenantIdFormat`
   - `getSchemaName`
   - `getTenantHeaders`
   - `extractTenantId`

2. The `userRoleUtils.js` file is using an incorrect import path for the AWS Amplify cache:
   ```javascript
   import { cache } from 'aws-amplify/utils';
   ```
   This path is not valid in Amplify v6, which is being used in the project.

### Fix Applied
The script makes the following changes:

1. **In tenantUtils.js**:
   - Adds the `getSecureTenantId` function that retrieves and validates the tenant ID
   - Adds the `validateTenantIdFormat` function as an alias for the existing `isValidUUID` function
   - Adds the `getSchemaName` function to generate database schema names from tenant IDs
   - Adds the `getTenantHeaders` function to generate headers for API requests
   - Adds the `extractTenantId` function to extract tenant IDs from URL paths

2. **In userRoleUtils.js**:
   - Updates the cache import to use the correct path for Amplify v6:
     ```javascript
     import { Cache as cache } from '@aws-amplify/core';
     ```

## Implementation Details

### Added Functions to tenantUtils.js
1. **getSecureTenantId**: Retrieves the tenant ID and validates its format
2. **validateTenantIdFormat**: Alias for `isValidUUID` for backward compatibility
3. **getSchemaName**: Generates database schema names from tenant IDs
4. **getTenantHeaders**: Creates headers for API requests with tenant information
5. **extractTenantId**: Extracts tenant IDs from URL paths or other sources

### Security Considerations
- No hardcoded tenant IDs are used
- The implementation maintains strict tenant isolation
- The functions include proper error handling and logging
- No sensitive information is exposed in the process

## Execution
- **Date**: 2025-04-25
- **Status**: Pending
- **Backup Created**: Yes (timestamp format: YYYY-MM-DDTHH-MM-SS.SSSZ)

## Related Files
- `/frontend/pyfactor_next/src/utils/tenantUtils.js` - Modified
- `/frontend/pyfactor_next/src/utils/userRoleUtils.js` - Modified
- Backups created with timestamp in the filename
