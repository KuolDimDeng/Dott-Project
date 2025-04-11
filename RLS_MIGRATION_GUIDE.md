# Migration to Row-Level Security (RLS)

This document outlines the migration from schema-per-tenant to a Row-Level Security (RLS) approach for multi-tenancy.

## Overview

We have transitioned from a schema-per-tenant approach to using PostgreSQL's Row-Level Security (RLS) feature for tenant isolation. This provides several benefits:

1. **Simplified architecture**: All data resides in the public schema instead of separate schemas per tenant
2. **Improved performance**: No need to switch schemas or manage separate schema permissions
3. **Better security**: RLS policies are enforced by the database, preventing data leakage even with incorrect application code
4. **Reduced overhead**: Fewer schemas means less database overhead
5. **Easier maintenance**: Schema migrations only happen once instead of per tenant

## Migration Steps

The migration involved the following steps:

1. **Data migration script**: `migrate_to_rls.py` identified all tenant schemas and moved data to the public schema with tenant_id
2. **Apply RLS policies**: RLS policies were added to all tenant-aware tables
3. **Final SQL migration**: `migrate_to_rls_final.sql` ensured all tables had tenant_id columns and proper RLS policies
4. **Code updates**: Tenant creation and context functions were updated to use RLS instead of schema switching

## How RLS Works

RLS works by adding a policy to each table that filters rows based on the current tenant context. The current tenant is set in the PostgreSQL session variable `app.current_tenant_id`.

Example policy:

```sql
CREATE POLICY tenant_isolation_policy ON inventory_product
AS RESTRICTIVE
USING (
    (tenant_id::TEXT = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset'))
    OR current_setting('app.current_tenant_id', TRUE) = 'unset'
);
```

This policy ensures that:
- Users only see rows from their own tenant (when tenant context is set)
- Special "unset" value can be used to bypass tenant isolation (for admin/system users)

## Using Tenant Context

To work with tenant data, set the tenant context before performing operations:

### Python Code

```python
# Set tenant context
from custom_auth.rls import tenant_context

with tenant_context(tenant_id):
    # All database operations here will only see data for this tenant
    items = Item.objects.all()
```

### SQL

```sql
-- Set tenant context
SELECT set_tenant_context('11111111-1111-1111-1111-111111111111');

-- Query will only return data for this tenant
SELECT * FROM inventory_product;

-- Clear tenant context when done
SELECT clear_tenant_context();
```

## Schema Naming Compatibility

For backward compatibility, the `schema_name` field was kept in the Tenant model, but it's no longer used to create actual schemas. Instead, it's just an identifier derived from the tenant ID.

## Testing RLS

You can test if RLS is working correctly using:

```sql
-- Test RLS for a specific table
SELECT * FROM test_rls_for_table('inventory_product');
```

## Troubleshooting

If rows from other tenants are visible:

1. Verify the table has a `tenant_id` column: `SELECT * FROM rls_status WHERE table_name = 'your_table';`
2. Ensure RLS is enabled for the table: `ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;`
3. Create or fix the RLS policy:

```sql
DROP POLICY IF EXISTS tenant_isolation_policy ON your_table;
CREATE POLICY tenant_isolation_policy ON your_table
AS RESTRICTIVE
USING (
    (tenant_id::TEXT = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset'))
    OR current_setting('app.current_tenant_id', TRUE) = 'unset'
);
```

## Remaining Schema References

If you find code that still references schemas, use the `find_schema_references.sh` script to locate them. These references should be updated to use RLS instead.

## Benefits of Migration

1. **Simplified tenant creation**: Creating a new tenant is faster as it doesn't require creating a new schema
2. **Easier database management**: All tables are in the public schema, making backups and migrations simpler
3. **Improved scalability**: Adding thousands of tenants doesn't create thousands of schemas
4. **Better security**: RLS is enforced at the database level, providing strong isolation 