# Row-Level Multi-Tenancy Migration

This repo contains changes to implement row-level multi-tenancy, replacing the previous schema-based approach.

## Why Row-Level Multi-Tenancy?

Row-level multi-tenancy offers several advantages over schema-based approaches:

1. **Scalability**: Single schema makes it easier to handle a growing number of tenants
2. **Simplified Maintenance**: No need to manage multiple schemas
3. **Easier Backups**: Centralized data makes backups and restores simpler
4. **Reporting & Analytics**: Faster cross-tenant queries by eliminating schema switching
5. **Global Operations**: Easier to perform global operations across all tenant data

## Implementation Overview

The implementation includes:

1. Modified `Tenant` model (removed schema_name and related fields)
2. New `TenantAwareModel` abstract base class for tenant-specific models
3. `TenantManager` to automatically filter queries by tenant
4. Thread-local tenant context management
5. Updated middleware to set tenant context for each request
6. Modified database router for tenant-aware models
7. Migration command to transfer data from tenant schemas to the main schema

## Core Components

- `TenantAwareModel`: Base class that adds a tenant foreign key field
- `TenantManager`: Automatically filters queries by the current tenant context
- `tenant_context.py`: Functions to manage tenant context in thread-local storage
- `TenantMiddleware`: Extracts tenant information from requests
- `TenantAwareRouter`: Controls database operations for tenant-aware models

## Migration Steps

1. Run database migrations to update the models:
   ```
   python manage.py migrate
   ```

2. Run the migration command to transfer data from tenant schemas:
   ```
   # Migrate all tenants
   python manage.py migrate_to_row_tenancy --all
   
   # Migrate a specific tenant
   python manage.py migrate_to_row_tenancy --tenant-id <tenant_id>
   
   # Migrate a specific model
   python manage.py migrate_to_row_tenancy --all --model finance.Account
   
   # Dry run (no changes)
   python manage.py migrate_to_row_tenancy --all --dry-run
   ```

3. Verify the migration by checking data in the main schema:
   ```
   python manage.py shell
   ```
   ```python
   from custom_auth.models import Tenant
   from finance.models import Account
   from custom_auth.tenant_context import set_current_tenant
   
   # Set tenant context
   tenant = Tenant.objects.first()
   set_current_tenant(tenant.id)
   
   # Query tenant-specific data
   accounts = Account.objects.all()  # Will be filtered by tenant
   print(f"Found {accounts.count()} accounts for tenant {tenant.name}")
   
   # Access data across all tenants
   all_accounts = Account.all_objects.all()
   print(f"Found {all_accounts.count()} accounts across all tenants")
   ```

## Troubleshooting

- If you encounter any issues with tenant context, ensure that `set_current_tenant()` is called before accessing tenant-specific models.
- The middleware automatically sets tenant context from request headers, session, or authenticated user.
- To manually set tenant context, use `set_current_tenant(tenant_id)` and `clear_current_tenant()`.

## Future Improvements

- Add database indexing optimization for tenant queries
- Implement tenant data isolation at the database level
- Add audit logging for cross-tenant operations
- Improve tenant context handling in async code

## Security Considerations

- Row-level tenancy relies on application-level filtering, so careful use of the ORM is essential
- Always use the tenant-aware manager (`objects`) for queries instead of `all_objects` except in specific admin scenarios
- Consider database-level security to complement application-level isolation 