# User Role Attribute Fix

## Overview

This document describes the fix implemented for the user role attribute name in the Cognito user creation process.

## Problem Description

When a user (tenant owner) invites a new user to the system, the API was encountering the following error:

```
InvalidParameterException: Attributes did not conform to the schema: Type for attribute {custom:role} could not be determined
```

The issue was that our code was using `custom:role` as the attribute name, but the Cognito User Pool schema expects `custom:userrole` (different casing and no underscore).

## Fix Implementation

The fix was implemented in script `Version0053_fix_userrole_attribute_name.js` and addresses the following files:

1. `/src/utils/cognito.js` - The utility that creates new users in Cognito

### Changes Made

#### In cognito.js

1. Changed all instances of `custom:role` to `custom:userrole` to match the Cognito schema:
   ```javascript
   // Before
   { Name: 'custom:role', Value: mapRoleForCognito(userData.role) }

   // After
   { Name: 'custom:userrole', Value: mapRoleForCognito(userData.role) }
   ```

2. Updated all direct references to this attribute throughout the file for consistency.

## Testing

To verify this fix works correctly:

1. Log in as a tenant owner
2. Navigate to Settings > User Management
3. Add a new user by providing their email address
4. The user should be created successfully in Cognito
5. The invitation email should be sent
6. After the user completes registration, they should have the correct role assigned

## Technical Details

### Attribute Naming in Cognito

AWS Cognito User Pools have specific schema requirements for custom attributes. The names must match exactly what is defined in the User Pool's attribute schema, including casing.

In this case, the attribute for user roles is defined as `custom:userrole` in the User Pool, but our code was incorrectly using `custom:role`.

### Best Practices

To avoid similar issues in the future:

1. Always use the `CognitoAttributes` utility, which has constants for all attribute names:
   ```javascript
   import CognitoAttributes from '@/utils/CognitoAttributes';
   
   // Use this
   { Name: CognitoAttributes.USER_ROLE, Value: 'employee' }
   
   // Instead of this
   { Name: 'custom:userrole', Value: 'employee' }
   ```

2. When creating new custom attributes in Cognito, document them in the `CognitoAttributes.js` utility file to ensure consistent usage.

## Related Documentation

- [AWS Cognito Custom Attributes](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-custom-attributes)
- [ProjectX Cognito Attributes Reference](/docs/CognitoAttributesReference.md)

## Script Registry Entry

| Script ID | Script Name | Purpose | Created Date | Status | Applied To |
|-----------|-------------|---------|-------------|--------|------------|
| F0053 | Version0053_fix_userrole_attribute_name.js | Fixes user role attribute name from 'custom:role' to 'custom:userrole' to match Cognito schema | 2025-05-03 | Executed | src/utils/cognito.js | 