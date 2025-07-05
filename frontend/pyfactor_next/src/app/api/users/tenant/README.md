# Users API - Tenant Endpoint

## Overview

This API endpoint provides server-side access to Cognito users filtered by tenant ID. It leverages AWS Cognito admin APIs that require server-side credentials to list all users within a specific tenant.

## Endpoint Details

- **URL**: `/api/users/tenant`
- **Method**: `GET`
- **Query Parameters**:
  - `tenantId` (required): The tenant ID to filter users by

## Response Format

Success response:
```json
{
  "users": [
    {
      "id": "user-uuid-123",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "owner",
      "is_active": true,
      "date_joined": "2023-01-01T00:00:00.000Z",
      "last_login": "2023-01-10T00:00:00.000Z",
      "tenant_id": "tenant-uuid-123"
    }
  ]
}
```

Error response:
```json
{
  "error": "Error message"
}
```

## Required Environment Variables

For this endpoint to work correctly, the following environment variables must be set:

- `AWS_REGION` or `NEXT_PUBLIC_AWS_REGION`: The AWS region where your Cognito user pool is located
- `COGNITO_USER_POOL_ID` or `NEXT_PUBLIC_COGNITO_USER_POOL_ID`: The ID of your Cognito user pool
- `AWS_ACCESS_KEY_ID`: (Server-side) AWS access key with permission to list Cognito users
- `AWS_SECRET_ACCESS_KEY`: (Server-side) AWS secret key with permission to list Cognito users

## Tenant Isolation

This endpoint implements proper tenant isolation by:

1. Requiring a tenant ID parameter
2. Only returning users that have the provided tenant ID in either:
   - `custom:tenant_ID` attribute
   - `custom:businessid` attribute

## Error Handling

The endpoint implements robust error handling:

- Missing tenant ID parameter returns a 400 error
- Missing AWS configuration returns a 500 error
- Errors during API call return a 500 error with appropriate message
- Empty result sets return an empty array instead of an error

## Usage Example

```javascript
// Client-side fetch example
async function fetchUsers(tenantId) {
  try {
    const response = await fetch(`/api/users/tenant?tenantId=${encodeURIComponent(tenantId)}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch users');
    }
    
    return data.users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}
```

## Security Considerations

1. This API requires proper AWS credentials with minimum required permissions
2. It should only be called by authenticated users
3. It implements proper tenant isolation to prevent data leakage
4. The AWS credentials are kept server-side and never exposed to clients 