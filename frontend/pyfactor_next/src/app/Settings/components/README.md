# Settings Management Components

## Recent Changes

### Tenant ID Issue Fix (2025-05-03)

The SettingsManagement component was experiencing an error "Tenant ID not found" when trying to list users in the User Management section. This issue has been fixed with script `Version0045_fix_tenant_id_in_user_management.js`.

#### Issue Details

- The component was looking for tenant ID only in the `custom:tenant_ID` attribute
- However, the actual tenant ID was stored in `custom:businessid` attribute
- This mismatch caused the tenant ID lookup to fail when retrieving users

#### Changes Made

1. Updated the tenant ID retrieval to check both attribute locations:
   - `custom:tenant_ID` (CognitoAttributes.TENANT_ID)
   - `custom:businessid` (CognitoAttributes.BUSINESS_ID)

2. Modified the Cognito filter to search for users with either attribute:
   ```javascript
   Filter: `custom:tenant_ID = "${currentTenantId}" or custom:businessid = "${currentTenantId}"`
   ```

3. Added proper imports for Cognito client and commands:
   ```javascript
   import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
   ```

#### Usage Notes

The component now uses the CognitoAttributes utility for reliable attribute access. When accessing Cognito attributes, always use:

```javascript
import CognitoAttributes from '@/utils/CognitoAttributes';

// Get tenant ID from multiple possible locations
const tenantId = CognitoAttributes.getTenantId(userAttributes) || 
                CognitoAttributes.getValue(userAttributes, CognitoAttributes.BUSINESS_ID);
```

Never directly access the attribute strings to avoid casing and naming errors. 