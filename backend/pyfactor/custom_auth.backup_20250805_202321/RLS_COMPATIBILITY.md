# Row Level Security (RLS) Compatibility Functions

## Overview
This document describes the RLS compatibility functions in the `custom_auth.rls` module. These functions provide backward compatibility for code that relies on older naming conventions while using the current RLS implementation.

## Issues Fixed on 2025-04-19

### Issue 1: Missing Set Tenant ID Function
The application was failing to start with the following error:
```
ImportError: cannot import name 'set_current_tenant_id' from 'custom_auth.rls' (/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/rls.py)
```

**Solution:** Added a compatibility function `set_current_tenant_id()` to the `custom_auth.rls` module that wraps the existing `set_tenant_context()` function to maintain backward compatibility with code that uses the older naming convention.

### Issue 2: Missing RLS Verification Function
After fixing the first issue, the application encountered another error:
```
ImportError: cannot import name 'verify_rls_setup' from 'custom_auth.rls' (/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/rls.py)
```

**Solution:** Added a `verify_rls_setup()` function to the `custom_auth.rls` module that performs a comprehensive verification of the RLS configuration to ensure tenant isolation is properly enforced.

### Issue 3: Missing Set Tenant In DB Function
After fixing the previous issues, a third error was encountered:
```
ImportError: cannot import name 'set_tenant_in_db' from 'custom_auth.rls' (/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/rls.py)
```

**Solution:** Added a compatibility function `set_tenant_in_db()` to the `custom_auth.rls` module as an alias for `set_tenant_context()`.

### Issue 4: Missing Setup Tenant Context Functions
After fixing the previous issues, additional errors were encountered:
```
ImportError: cannot import name 'setup_tenant_context_in_db' from 'custom_auth.rls'
ImportError: cannot import name 'setup_tenant_context_in_db_async' from 'custom_auth.rls'
```

**Solution:** Added two more compatibility functions:
- `setup_tenant_context_in_db()`: A synchronous function that wraps `set_tenant_context()`
- `setup_tenant_context_in_db_async()`: An asynchronous function for async views that wraps `set_tenant_context()`

### Issue 5: Missing Async Set Tenant In DB Function
After fixing the previous issues, an additional error was encountered:
```
ImportError: cannot import name 'set_tenant_in_db_async' from 'custom_auth.rls'
```

**Solution:** Added a compatibility function `set_tenant_in_db_async()` as an asynchronous wrapper that calls `setup_tenant_context_in_db_async()`.

### Issue 6: Missing RLS Policy Creation Function
After fixing the previous issues, a final error was encountered:
```
ImportError: cannot import name 'create_rls_policy_for_table' from 'custom_auth.rls'
```

**Solution:** Added a function `create_rls_policy_for_table()` that creates Row Level Security policies for a specified table, enabling tenant isolation for all CRUD operations.

## Compatibility Functions

The `custom_auth.rls` module provides several compatibility functions that serve as aliases for the primary RLS functions:

| Compatibility Function | Primary Function | Description |
|------------------------|-----------------|-------------|
| `get_current_tenant_id()` | `get_tenant_context()` | Gets the current tenant ID |
| `set_current_tenant_id()` | `set_tenant_context()` | Sets the tenant context |
| `set_tenant_in_db()` | `set_tenant_context()` | Sets the tenant context (alias) |
| `set_tenant_in_db_async()` | `set_tenant_context()` | Async version for setting tenant context (alias) |
| `setup_tenant_context_in_db()` | `set_tenant_context()` | Sets the tenant context (alias) |
| `setup_tenant_context_in_db_async()` | `set_tenant_context()` | Async version for setting tenant context |
| `clear_current_tenant_id()` | `clear_tenant_context()` | Clears the tenant context |
| `tenant_context()` | Context manager | Temporarily sets a tenant context |
| `verify_rls_setup()` | N/A | Verifies RLS configuration is working correctly |
| `create_rls_policy_for_table()` | N/A | Creates RLS policies for a specified table |

## RLS Verification

The `verify_rls_setup()` function performs several checks to ensure RLS is properly configured:

1. Confirms that the necessary PostgreSQL functions exist
2. Tests setting and retrieving tenant context
3. Tests clearing tenant context
4. Verifies RLS policies are applied to tables with tenant_id columns

This verification runs during application startup and logs detailed information about any potential issues with the RLS configuration.

## RLS Policy Creation

The `create_rls_policy_for_table()` function creates four policies for a specified table:

1. SELECT policy: Only allows reading rows where tenant_id matches the current tenant context
2. INSERT policy: Only allows inserting rows where tenant_id matches the current tenant context
3. UPDATE policy: Only allows updating rows where tenant_id matches the current tenant context
4. DELETE policy: Only allows deleting rows where tenant_id matches the current tenant context

All policies include an exception for when the tenant context is 'unset', which allows administrative access.

## Usage Guidelines

1. For new code, use the primary function names (`set_tenant_context`, `get_tenant_context`, etc.)
2. For maintaining backward compatibility, the older function names are supported
3. Use the async functions (`setup_tenant_context_in_db_async`, `set_tenant_in_db_async`) in async views and middleware
4. All tenant context functions properly enforce tenant isolation in accordance with security requirements

## Version History

- v1.6 (2025-04-19): Added `create_rls_policy_for_table()` function to create RLS policies
- v1.5 (2025-04-19): Added `set_tenant_in_db_async()` compatibility function
- v1.4 (2025-04-19): Added `setup_tenant_context_in_db()` and `setup_tenant_context_in_db_async()` compatibility functions
- v1.3 (2025-04-19): Added `set_tenant_in_db()` compatibility function
- v1.1 (2025-04-19): Added `verify_rls_setup()` function to verify RLS configuration
- v1.0 (2025-04-19): Added `set_current_tenant_id()` compatibility function to fix import error
- v0.9 (2025-04-15): Initial implementation with partial compatibility functions

## Related Files

- `/backend/pyfactor/custom_auth/rls.py`: Main RLS implementation
- `/backend/pyfactor/custom_auth/middleware.py`: RLS middleware that uses these functions
- `/backend/pyfactor/scripts/20250419_rls-fix_missing-tenant-id-function.py`: Verification script 