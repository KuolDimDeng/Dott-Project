# Production-Ready Row Level Security (RLS) Guide

## Introduction

This guide provides a comprehensive approach to implementing and troubleshooting PostgreSQL Row Level Security (RLS) in production environments. It specifically addresses common issues with AWS RDS and tenant isolation in multi-tenant applications.

## Quick Start

To immediately fix RLS issues in your environment:

```bash
# Run the production-ready RLS fix
cd backend/pyfactor
./fix_rls_production.sh

# Verify middleware configuration
python verify_rls_middleware.py

# Restart your server
python run_https_server_fixed.py
```

## Understanding RLS Issues

Common RLS problems include:

1. **Tenant data leakage** - Users seeing data from other tenants
2. **Permission errors** - `permission denied to set parameter "app.current_tenant_id"`
3. **RLS policy failures** - Incorrect SQL policies allowing too much or too little access
4. **Middleware issues** - Tenant context not being properly set in requests
5. **Connection pooling problems** - RLS context not properly maintained with connection reuse

## The Production-Ready Solution

Our solution implements:

1. **Session-level parameters** - No database-level settings required (avoids permission issues)
2. **Robust tenant context functions** - Error-handling functions with fallbacks
3. **Enhanced middleware** - Better tenant detection from Cognito, headers, and other sources
4. **Comprehensive testing** - Verification functions for each table
5. **AWS RDS compatibility** - Works with AWS-managed PostgreSQL

## Technical Implementation Details

### Core Database Functions

Our solution creates three critical database functions:

```sql
-- Get tenant context safely with fallbacks
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS TEXT AS $$
  -- Implementation that handles missing parameters gracefully
$$ LANGUAGE plpgsql;

-- Set tenant context at session level (not database level)
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
RETURNS VOID AS $$
  -- Implementation that avoids permission issues
$$ LANGUAGE plpgsql;

-- Clear tenant context, allowing full data access
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS VOID AS $$
  -- Implementation that resets to default state
$$ LANGUAGE plpgsql;
```

### RLS Policies

Each tenant-aware table gets a standardized policy:

```sql
CREATE POLICY tenant_isolation_policy ON table_name
AS RESTRICTIVE
USING (
    (tenant_id::TEXT = get_current_tenant_id() AND get_current_tenant_id() != 'unset')
    OR get_current_tenant_id() = 'unset'
);
```

### Enhanced Middleware

Our enhanced middleware (`EnhancedRowLevelSecurityMiddleware`) provides:

1. Better tenant detection from multiple sources
2. Proper handling of async requests
3. Error resilience
4. AWS Cognito integration
5. Public path handling

## AWS RDS Configuration

For AWS RDS, ensure:

1. The database user has permissions to create/replace functions
2. Connection pooling settings maintain session state
3. Your application has proper IAM policies for RDS access
4. Connection timeout settings are appropriate for your workload

## Cognito Integration 

To integrate with AWS Cognito:

1. Ensure the `tenant_id` attribute is set in Cognito user attributes
2. Use the `custom:tenant_id` attribute if using custom attributes
3. Make sure your app retrieves and passes these attributes

## Scalability Considerations

This solution is designed to scale to 10,000+ users by:

1. Using efficient RLS policies that leverage PostgreSQL's query planner
2. Minimizing overhead of context switching
3. Using session variables instead of connection-level parameters
4. Supporting connection pooling for high-traffic applications

## Troubleshooting

If you still encounter RLS issues:

### Verify RLS is working

```sql
-- Check if RLS is enabled for tables
SELECT * FROM rls_status;

-- Test RLS for a specific table
SELECT * FROM test_rls_for_table('your_table_name');
```

### Check middleware

Ensure the middleware is properly configured in settings.py:

```python
MIDDLEWARE = [
    # ... other middleware
    'custom_auth.enhanced_rls_middleware.EnhancedRowLevelSecurityMiddleware',
    # ... other middleware
]
```

### Reset database if needed

If issues persist, you can reset the database with:

```bash
./scripts/reset-database.sh
```

## Maintenance & Best Practices

1. After schema migrations, check that new tables have proper RLS policies
2. Regularly run verification to ensure RLS is working correctly
3. Use the tenant context management functions rather than direct session variables
4. Always clear tenant context after administrative operations
5. Include RLS testing in your test suite

## Security Best Practices

1. Never hardcode tenant IDs in application code
2. Use the EnhancedRowLevelSecurityMiddleware to manage tenant context
3. Always validate tenant IDs before setting them in context
4. Implement proper user authentication checks before accessing tenant data
5. Use audit logging to track tenant context changes

## Additional Resources

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [AWS RDS for PostgreSQL](https://aws.amazon.com/rds/postgresql/)
- [Django Database Connection Management](https://docs.djangoproject.com/en/stable/ref/databases/#connection-management) 