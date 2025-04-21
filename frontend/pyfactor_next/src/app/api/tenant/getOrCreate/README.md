# Tenant Creation API

This API route handles the creation and management of tenants in the PyFactor application.

## Overview

The `/api/tenant/getOrCreate` endpoint is responsible for:

1. Finding an existing tenant for a user
2. Creating a new tenant if one doesn't exist
3. Associating the user with the tenant
4. Updating Cognito attributes with tenant information
5. Setting up proper RLS (Row Level Security) configuration

## Row Level Security Integration

This API properly integrates with PostgreSQL's Row Level Security (RLS) feature by:

1. Setting the `app.current_tenant_id` session variable to 'unset' to bypass RLS for tenant management operations
2. Creating tenant records with proper tenant_id values
3. Maintaining backward compatibility with schema-based isolation by still creating schemas (though they're no longer used)

## Request Format

```json
{
  "tenantId": "optional-uuid-if-already-generated",
  "planId": "free|professional|enterprise",
  "billingCycle": "monthly|annual"
}
```

## Response Format

### Success (200 OK)

```json
{
  "success": true,
  "tenantId": "uuid-of-tenant",
  "message": "Found existing tenant for user | Created new tenant | Associated tenant with user",
  "isNew": false|true
}
```

### Error (401 Unauthorized)

```json
{
  "success": false,
  "message": "Unauthorized: No authenticated user found"
}
```

### Error (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Error processing tenant request: [error message]",
  "error": "detailed error message"
}
```

## Implementation Details

1. **Authentication**: Uses JWT tokens from the request to identify the user
2. **Deterministic Tenant IDs**: Generates UUIDs deterministically based on the user ID
3. **Transaction Safety**: Uses database transactions with advisory locks to prevent race conditions
4. **RLS Bypass**: Sets the tenant context to 'unset' to bypass RLS for tenant management operations
5. **Cognito Integration**: Updates user attributes with tenant information

## Usage in the Application

This API is called during the onboarding process when a user selects a subscription plan. It ensures the user has a tenant record in the database and that their Cognito attributes are properly updated.

## Troubleshooting

If the API returns a 404 error, check:

1. The Next.js API route is properly configured
2. The request is not being proxied incorrectly to the backend Django API
3. The database connection is properly configured

If there are RLS issues:

1. Make sure the database has proper RLS policies for all tenant-aware tables
2. Verify the `app.current_tenant_id` session variable is being set correctly
3. Test RLS configuration with the `testRlsConfiguration` utility 