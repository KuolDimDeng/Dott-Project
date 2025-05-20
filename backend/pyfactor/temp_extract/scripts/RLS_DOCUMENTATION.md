# Row Level Security (RLS) Management Documentation

## Overview

This document describes the Row Level Security (RLS) implementation for the multi-tenant application using PostgreSQL on AWS RDS. RLS ensures strict tenant data isolation at the database level, preventing tenants from accessing each other's data.

## Architecture

The RLS implementation consists of several components:

1. **Database Functions**: SQL functions that manage tenant context and enforce isolation
2. **RLS Policies**: PostgreSQL policies that filter data based on tenant ID
3. **Django Middleware**: Intercepts requests to set the appropriate tenant context
4. **Management Scripts**: Tools to configure, fix, and verify RLS setup

## Scripts

### 1. RLS Manager (`rls_manager.py`)

**Purpose**: Main script to manage and diagnose RLS configuration in production.

**Usage**:
```
python scripts/rls_manager.py [--fix-only | --check-only | --help]
```

**Options**:
- `--fix-only`: Only apply RLS fixes without verification
- `--check-only`: Only check RLS configuration without applying fixes
- `--help`: Show help information

**Features**:
- Comprehensive logging to both console and file
- Command-line options for different operations
- Error handling and informative error messages
- Summary of operations and next steps

### 2. RLS Fix Script (`fix_rls_direct.py`)

**Purpose**: Directly configures and fixes RLS in the database.

**What it does**:
1. Drops any existing conflicting RLS functions
2. Creates standardized RLS functions for tenant isolation
3. Creates alias functions for backward compatibility
4. Applies RLS policies to all tenant tables
5. Creates a test table and verifies isolation works

### 3. RLS Check Script (`check_rls.py`)

**Purpose**: Verifies that RLS is correctly configured and functioning.

**What it does**:
1. Tests if RLS functions exist and work correctly
2. Tests tenant isolation using a test table
3. Verifies RLS middleware is correctly configured
4. Checks database configuration for RLS compatibility
5. Reports on which tables have RLS enabled

### 4. UUID Type Fix Script (`20250419_rls001_fix_uuid_type_and_isolation.py`)

**Purpose**: Fixes UUID type mismatch issues in RLS policies and ensures proper tenant isolation.

**What it does**:
1. Creates proper type conversion functions (uuid_to_text, text_to_uuid)
2. Recreates the RLS status view with all required columns
3. Fixes RLS policies to properly handle UUID tenant_id columns
4. Tests and verifies tenant isolation for both text and UUID tenant IDs
5. Applies correct policies to all tenant tables based on their tenant_id column type

**Added in**: v1.0 (2025-04-19)
**Issue ID**: RLS001

## Database Functions

### Primary Functions

1. **`get_tenant_context()`**: 
   - Returns the current tenant ID from session variables
   - Default return is 'unset' (indicating admin/superuser access)

2. **`set_tenant_context(tenant_id)`**:
   - Sets the tenant context in the current session
   - Stores in both `app.current_tenant_id` and `app.current_tenant`

3. **`clear_tenant_context()`**:
   - Resets tenant context to 'unset'
   - Used when ending a tenant session

### Alias Functions

1. **`get_current_tenant_id()`**:
   - Alias for `get_tenant_context()`
   - Provided for backward compatibility

2. **`current_tenant_id()`**:
   - Another alias for `get_tenant_context()`
   - Used in RLS policies for simplified syntax

### Type Conversion Functions (Added in RLS001)

1. **`uuid_to_text(uuid)`**:
   - Safely converts UUID values to text
   - Used in RLS policies for proper UUID tenant_id comparison

2. **`text_to_uuid(text)`**:
   - Safely converts text values to UUID
   - Handles invalid UUID format gracefully

## RLS Policies

### Standard Text Policy

For tables with TEXT tenant_id columns:

```sql
CREATE POLICY tenant_isolation_policy ON [table_name]
AS RESTRICTIVE
USING (
    (tenant_id::TEXT = current_tenant_id() AND current_tenant_id() != 'unset')
    OR current_tenant_id() = 'unset'
);
```

### UUID Policy (Added in RLS001)

For tables with UUID tenant_id columns:

```sql
CREATE POLICY tenant_isolation_policy ON [table_name]
AS RESTRICTIVE
USING (
    (uuid_to_text(tenant_id) = current_tenant_id() AND current_tenant_id() != 'unset')
    OR current_tenant_id() = 'unset'
);
```

These policies ensure:
1. Tenants can only see rows where `tenant_id` matches their context
2. Users with 'unset' tenant (admins) can see all rows
3. UUID values are properly compared with text tenant context

## Django Integration

The RLS middleware (`RowLevelSecurityMiddleware`) integrates with Django to:

1. Extract tenant ID from requests (headers, user object, session)
2. Set the tenant context in the database session
3. Clear the context when processing public paths
4. Add tenant ID to response headers for debugging

## Troubleshooting

### Common Issues

1. **Function Definition Conflicts**:
   - Run `rls_manager.py` to recreate all functions with consistent definitions

2. **Missing RLS Policies**:
   - Run `rls_manager.py --fix-only` to apply policies to all tenant tables

3. **Tenant Isolation Not Working**:
   - Verify RLS is enabled with `rls_manager.py --check-only`
   - Check log files in the `logs` directory

4. **UUID/Text Type Mismatch**:
   - Run `20250419_rls001_fix_uuid_type_and_isolation.py` to fix UUID comparisons in policies
   - This issue typically manifests as "operator does not exist: uuid = text" errors

5. **Permission Errors**:
   - Ensure the database user has permission to create functions and policies
   - Check PostgreSQL version supports RLS (9.5+)

6. **Middleware Not Active**:
   - Verify middleware is correctly added to `MIDDLEWARE` in Django settings

### Log Files

Log files are stored in `backend/pyfactor/logs/` with timestamp-based filenames:
- `rls_manager_YYYYMMDD_HHMMSS.log`
- `rls_uuid_fix_YYYYMMDD_HHMMSS.log`

## Production Deployment Notes

1. **Database Initialization**:
   - Run `20250419_rls001_fix_uuid_type_and_isolation.py` during initial database setup
   - Include in deployment scripts

2. **Migrations**:
   - Run RLS check after schema migrations to ensure policies are applied to new tables

3. **Security**:
   - Never set tenant context to 'unset' for regular users
   - Reserve 'unset' for administrative operations only

4. **Performance**:
   - RLS adds minimal overhead when properly indexed
   - Ensure `tenant_id` columns are indexed in all tables

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [AWS RDS PostgreSQL Security Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.Security.html)
- [RLS Scripts Registry](./RLS_REGISTRY.md) - Registry of all RLS scripts and their purpose 