# User Invitation Attributes Fix

## Overview

This document describes the fix implemented for the user invitation system to ensure that new users receive all necessary tenant attributes from the owner who invited them.

## Problem Description

When a user (tenant owner) invites a new user to the system, the new user wasn't receiving all necessary tenant attributes, specifically:

1. The `custom:tenant_ID` attribute (with uppercase ID) was not being correctly set
2. Additional tenant attributes like `custom:businessid`, `custom:businessname`, etc. weren't being copied from the owner
3. The invitation process was not using the `CognitoAttributes` utility for standardized attribute access

This resulted in invited users being unable to sign in properly after registering, as they were missing the required tenant-specific attributes.

## Fix Implementation

The fix was implemented in script `Version0052_fix_user_invitation_attributes_cognito.js` and addresses the following files:

1. `/src/app/api/hr/employees/invite/route.js` - The API endpoint that handles user invitations
2. `/src/utils/cognito.js` - The utility that creates new users in Cognito

### Changes Made

#### In invite/route.js

1. Added proper import for `CognitoAttributes` utility
2. Enhanced tenant ID retrieval to check multiple sources (request, session attributes, directly via business ID)
3. Added extraction of owner attributes to copy to new users:
   - `custom:tenant_ID` (primary tenant identifier)
   - `custom:businessid` (for backward compatibility)
   - `custom:businessname`
   - `custom:businesstype`
   - `custom:businesscountry`
   - `custom:businessstate`
   - `custom:currency`
   - `custom:language`
4. Updated the user data object to include these owner attributes
5. Added detailed logging to help diagnose any future issues

#### In cognito.js

1. Added proper import for `CognitoAttributes` utility
2. Enhanced the `createCognitoUser` function to:
   - Add the primary tenant ID attribute with the correct format
   - Add business ID as an alias for backward compatibility
   - Copy all other tenant attributes from the userData object
   - Handle potential errors more robustly
   - Provide better logging

## Testing

To verify this fix works correctly:

1. Log in as a tenant owner
2. Navigate to Settings > User Management
3. Add a new user by providing their email address
4. After the user receives the invitation email and completes registration, they should be able to sign in
5. Verify the new user has the correct tenant ID and can access tenant-specific data

### Verification Steps

Use the AWS Cognito Console to verify that the new user has the following attributes:

- `custom:tenant_ID` - Should match the owner's tenant ID
- `custom:businessid` - Should match the owner's business ID
- `custom:businessname` - Should match the owner's business name
- Other tenant-related attributes should also match the owner's

## Technical Details

### Using CognitoAttributes Utility

The fix ensures all attribute access uses the `CognitoAttributes` utility for standardized casing and naming:

```javascript
// INCORRECT:
const tenantId = userAttributes['custom:tenant_id']; // Wrong casing!

// CORRECT:
import CognitoAttributes from '@/utils/CognitoAttributes';
const tenantId = CognitoAttributes.getTenantId(userAttributes);
```

### Handling Multiple Attribute Formats

The fix implements a comprehensive approach to tenant ID retrieval that checks multiple attribute names since there may be inconsistency in the casing used:

```javascript
// First try main utility function
tenantId = CognitoAttributes.getTenantId(session.user.attributes);

// As a fallback try the business ID
if (!tenantId) {
  tenantId = session.user.attributes[CognitoAttributes.BUSINESS_ID];
}
```

## Related Documentation

- [AWS Cognito UserPool Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [Cognito Custom Attributes](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-custom-attributes)
- [ProjectX Tenant Isolation Documentation](/docs/TenantIsolation.md)

## Script Registry Entry

| Script ID | Script Name | Purpose | Created Date | Status | Applied To |
|-----------|-------------|---------|-------------|--------|------------|
| F0052 | Version0052_fix_user_invitation_attributes_cognito.js | Fixes user invitation system to properly copy tenant attributes from owner to new users | 2025-05-10 | Executed | src/app/api/hr/employees/invite/route.js, src/utils/cognito.js | 