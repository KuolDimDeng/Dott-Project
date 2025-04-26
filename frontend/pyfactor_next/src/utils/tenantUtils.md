# Tenant Utilities Documentation

## Overview
The `tenantUtils.js` module provides utilities for managing tenant-related operations in the application. It handles tenant identification, caching, and validation using AWS Amplify v6.

## Recent Changes (v1.0)
- Updated AppCache import to use correct path from aws-amplify/utils
- Added missing function exports
- Implemented proper error handling
- Added comprehensive documentation

## Functions

### storeTenantId(tenantId)
Stores the tenant ID in the application cache.
- **Parameters**:
  - `tenantId` (string): The tenant ID to store
- **Returns**: Promise<void>
- **Throws**: Error if storage fails

### fixOnboardingStatusCase(status)
Standardizes the case of onboarding status strings.
- **Parameters**:
  - `status` (string): The status to fix
- **Returns**: string
- **Example**: "pending" -> "Pending"

### updateTenantIdInCognito(tenantId)
Updates the tenant ID in Cognito user attributes.
- **Parameters**:
  - `tenantId` (string): The new tenant ID
- **Returns**: Promise<void>
- **Throws**: Error if update fails

### setTokens(tokens)
Stores authentication tokens in the cache.
- **Parameters**:
  - `tokens` (Object): The tokens to store
- **Returns**: Promise<void>
- **Throws**: Error if storage fails

### forceValidateTenantId(tenantId)
Validates a tenant ID format and existence.
- **Parameters**:
  - `tenantId` (string): The tenant ID to validate
- **Returns**: Promise<boolean>
- **Throws**: Error if validation fails

### generateDeterministicTenantId(input)
Generates a deterministic tenant ID from input.
- **Parameters**:
  - `input` (string): The input to generate from
- **Returns**: string (UUID v4 format)

## Dependencies
- aws-amplify v6
  - auth: getCurrentUser, fetchAuthSession
  - utils: cache

## Usage Example
```javascript
import { storeTenantId, getTenantId } from '@/utils/tenantUtils';

// Store a tenant ID
await storeTenantId('123e4567-e89b-12d3-a456-426614174000');

// Get the current tenant ID
const tenantId = await getTenantId();
```

## Error Handling
All functions include proper error handling and logging. Errors are thrown with descriptive messages to aid in debugging.

## Cache Management
The module uses AWS Amplify's cache utility for storing tenant-related data. Cache keys are prefixed with 'tenant_' to avoid conflicts.

## Security Considerations
- No sensitive data is stored in plain text
- All operations are tenant-isolated
- Authentication is required for sensitive operations
- Input validation is performed on all functions 