# Row Level Security (RLS) Scripts Registry

This document maintains a registry of all RLS-related scripts for PostgreSQL tenant isolation in the application.

## Purpose

The scripts in this registry are used to configure, fix, test, and verify Row Level Security (RLS) in the PostgreSQL database, ensuring proper tenant isolation and data security in production environments.

## Scripts Registry

| Date       | Script Name                             | Version | Purpose                                  | Status      | Issue ID |
|------------|----------------------------------------|---------|------------------------------------------|-------------|----------|
| 2025-04-19 | 20250419_rls-fix_missing-tenant-id-function.py | v1.6    | Add missing RLS compatibility functions | Production | RLS002   |
| 2025-04-19 | 20250419_rls001_fix_uuid_type_and_isolation.py | v1.0    | Fix UUID type mismatch in RLS policies and ensure proper tenant isolation | Production | RLS001   |
| 2025-04-19 | rls_manager.py                          | v1.0    | Comprehensive RLS management tool for fixes and verification | Production | RLS000   |
| 2025-04-19 | check_rls.py                            | v1.0    | Verify RLS configuration and tenant isolation | Production | RLS000   |
| 2025-04-19 | check_rls_middleware.py                 | v1.0    | Verify RLS middleware configuration in Django | Production | RLS000   |

## Execution Guidelines

1. **New Deployments**:
   - Run `20250419_rls001_fix_uuid_type_and_isolation.py` to set up RLS with proper UUID support
   - Run `20250419_rls-fix_missing-tenant-id-function.py` to add and verify RLS compatibility functions
   - Verify with `rls_manager.py --check-only`

2. **Existing Deployments**:
   - If experiencing tenant isolation issues, run `20250419_rls001_fix_uuid_type_and_isolation.py`
   - If experiencing import errors with tenant functions, run `20250419_rls-fix_missing-tenant-id-function.py`
   - For routine verification, use `rls_manager.py --check-only`

3. **After Schema Changes**:
   - Run `rls_manager.py` to ensure RLS policies are applied to new tables

## Related Documentation

- [RLS_DOCUMENTATION.md](./RLS_DOCUMENTATION.md) - Comprehensive documentation about the RLS implementation
- [RLS_INSTALL_GUIDE.md](./RLS_INSTALL_GUIDE.md) - Step-by-step guide for setting up RLS
- [../custom_auth/RLS_COMPATIBILITY.md](../custom_auth/RLS_COMPATIBILITY.md) - Documentation about RLS compatibility functions

## Version History

| Date       | Script                                  | Version | Changes                                  |
|------------|----------------------------------------|---------|------------------------------------------|
| 2025-04-19 | 20250419_rls-fix_missing-tenant-id-function.py | v1.6    | Added create_rls_policy_for_table function |
| 2025-04-19 | 20250419_rls-fix_missing-tenant-id-function.py | v1.5    | Added set_tenant_in_db_async function for async tenant management |
| 2025-04-19 | 20250419_rls-fix_missing-tenant-id-function.py | v1.4    | Added async tenant context functions for async views |
| 2025-04-19 | 20250419_rls-fix_missing-tenant-id-function.py | v1.3    | Added set_tenant_in_db function for tenant management |
| 2025-04-19 | 20250419_rls-fix_missing-tenant-id-function.py | v1.2    | Added Django settings configuration for script execution |
| 2025-04-19 | 20250419_rls-fix_missing-tenant-id-function.py | v1.1    | Added verify_rls_setup function for RLS verification |
| 2025-04-19 | 20250419_rls-fix_missing-tenant-id-function.py | v1.0    | Initial version - Adds missing set_current_tenant_id compatibility function |
| 2025-04-19 | 20250419_rls001_fix_uuid_type_and_isolation.py | v1.0    | Initial version - Fixes UUID type mismatch and tenant isolation |
| 2025-04-19 | rls_manager.py                          | v1.0    | Initial version - Comprehensive RLS management tool |

## Maintainers

For questions or issues, please contact the database team. 