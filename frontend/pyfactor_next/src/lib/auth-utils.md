# Auth Utils Module

## Overview

The `auth-utils.js` module provides authentication utilities for API routes, specifically designed to resolve import issues in payroll API routes while maintaining integration with live AWS Cognito services.

## Purpose

This module was created to address build failures caused by missing `@/lib/auth-utils` imports in:
- `src/app/api/payroll/reports/route.js`
- `src/app/api/payroll/run/route.js`
- `src/app/api/payroll/export-report/route.js`
- `src/app/api/payroll/settings/route.js`

## Key Features

### ✅ Follows All Project Conditions

- **No Mock Data**: Connects to live AWS/Cognito services
- **CognitoAttributes Integration**: Uses `@/utils/CognitoAttributes` for proper attribute access
- **Correct Tenant ID Casing**: Uses `custom:tenant_ID` (uppercase ID)
- **No Cookies/localStorage**: Uses only Cognito Attributes and AWS App Cache
- **ES Modules**: Uses modern ES module syntax
- **Comprehensive Documentation**: Includes detailed JSDoc comments

### 🔐 Authentication Functions

#### `getAuthenticatedUser(request)`
- Retrieves authenticated user with proper Cognito attribute handling
- Uses CognitoAttributes utility for safe attribute access
- Validates tenant ID presence
- Returns user object with standardized properties

#### `verifyJWT(request)`
- Extracts and verifies JWT token from request headers
- Validates against current Amplify session
- Returns validation result with user information

#### `requireAuth(handler)`
- Middleware wrapper for API routes requiring authentication
- Automatically validates user and attaches to request object
- Returns 401 responses for unauthorized requests

#### `validateTenantAccess(user, requiredTenantId)`
- Validates user access to specific tenant resources
- Supports admin/owner role overrides
- Ensures proper tenant isolation

## Usage Examples

### Basic API Route Protection

```javascript
import { requireAuth, getUserFromRequest } from '@/lib/auth-utils';

export const GET = requireAuth(async (request) => {
  const user = getUserFromRequest(request);
  
  // Use user.tenantId for tenant-specific operations
  console.log('Authenticated user:', user.userId);
  console.log('Tenant ID:', user.tenantId);
  
  return NextResponse.json({ 
    message: 'Success',
    user: user.userId 
  });
});
```

### Manual Authentication Check

```javascript
import { getAuthenticatedUser } from '@/lib/auth-utils';

export async function POST(request) {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // Proceed with authenticated operations
  return NextResponse.json({ success: true });
}
```

### Tenant Access Validation

```javascript
import { getAuthenticatedUser, validateTenantAccess } from '@/lib/auth-utils';

export async function GET(request) {
  const user = await getAuthenticatedUser(request);
  const { searchParams } = new URL(request.url);
  const requestedTenantId = searchParams.get('tenantId');
  
  if (!validateTenantAccess(user, requestedTenantId)) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }
  
  // Proceed with tenant-specific operations
}
```

## Integration with Existing Code

This module integrates seamlessly with the existing `@/utils/authUtils.js` by:

1. **Importing Core Functions**: Uses `getAuthenticatedUserFromUtils` from existing authUtils
2. **Adding CognitoAttributes**: Wraps responses with CognitoAttributes utility calls
3. **API-Specific Enhancements**: Adds request validation and middleware patterns
4. **Backward Compatibility**: Maintains compatibility with existing code patterns

## Error Handling

The module includes comprehensive error handling:

- **Token Validation Errors**: Returns structured error responses
- **Session Verification Failures**: Logs warnings and returns null safely
- **Attribute Access Errors**: Uses CognitoAttributes utility for safe access
- **Tenant Access Violations**: Logs security warnings and denies access

## Security Considerations

- **Token Verification**: All requests verify JWT tokens against current session
- **Tenant Isolation**: Enforces strict tenant access controls
- **No Data Exposure**: Error responses don't expose sensitive information
- **Logging**: Security events are logged for monitoring

## Dependencies

- `aws-amplify/auth`: For Cognito integration
- `@/utils/CognitoAttributes`: For proper attribute access
- `@/utils/authUtils`: For core authentication functions
- `@/utils/logger`: For structured logging

## Version History

- **v1.0** (2025-05-22): Initial implementation with full Cognito integration
  - Created to resolve payroll API route import errors
  - Implemented all project conditions
  - Added comprehensive documentation

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure `@/utils/CognitoAttributes` exists and is properly exported
2. **Session Errors**: Verify Amplify configuration is complete
3. **Tenant Access Denied**: Check user's tenant ID attribute casing
4. **Token Verification Failures**: Ensure request includes valid Bearer token

### Debug Information

Enable debug logging by setting log level in `@/utils/logger` to see detailed authentication flow information.
