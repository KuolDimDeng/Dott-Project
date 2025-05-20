# Row Level Security (RLS) Migration - Final Instructions

After troubleshooting the RLS issues, here are the final steps needed to complete the migration from tenant schemas to row-level security.

## 1. Configure Database (Run as Superuser)

First, run this script as a database superuser (postgres):

```sql
-- Run as superuser
ALTER DATABASE dott_main SET app.current_tenant_id = 'unset';
ALTER USER dott_admin NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION BYPASSRLS;
SELECT pg_reload_conf();
```

## 2. Fix RLS for All Tables (Run as dott_admin)

Next, run this script as dott_admin:

```sql
-- Force RLS Fix for PostgreSQL (run as dott_admin)
-- Create or run the force_rls_fix.sql script

-- Function to apply fixed RLS policy to all tenant tables
CREATE OR REPLACE FUNCTION fix_rls_on_all_tables() 
RETURNS void AS $$
DECLARE
    t record;
BEGIN
    FOR t IN 
        SELECT table_schema, table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id'
          AND table_schema = 'public'
    LOOP
        -- Enable RLS on the table with FORCE option
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 
                      t.table_schema, t.table_name);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 
                      t.table_schema, t.table_name);
                      
        -- Drop existing policies  
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I.%I', 
                      t.table_schema, t.table_name);
                      
        -- Create the correct policy with explicit FOR ALL TO PUBLIC
        EXECUTE format('CREATE POLICY tenant_isolation_policy ON %I.%I
                         FOR ALL
                         TO PUBLIC
                         USING (
                           tenant_id::text = current_setting(''app.current_tenant_id'', true)
                           OR current_setting(''app.current_tenant_id'', true) = ''unset''
                         )', 
                      t.table_schema, t.table_name);
                      
        RAISE NOTICE 'Fixed RLS policy on %.%', t.table_schema, t.table_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute this to fix RLS on all tables
SELECT fix_rls_on_all_tables();
```

## 3. Update Django Code

1. **Update your models to inherit from TenantAwareModel**:

```python
from custom_auth.tenant_base_model import TenantAwareModel

class YourModel(TenantAwareModel):
    name = models.CharField(max_length=100)
    # ... other fields
```

2. **Use the tenant context manager**:

```python
from custom_auth.rls import set_current_tenant_id, tenant_context

# Set tenant context directly
set_current_tenant_id(user.tenant_id)

# Or use the context manager
with tenant_context(user.tenant_id):
    # Code in this block will only see this tenant's data
    items = Item.objects.all()
```

## 4. Key Files

- `/custom_auth/rls.py`: Core RLS utility functions
- `/custom_auth/tenant_base_model.py`: Base model for tenant-aware models
- `/custom_auth/middleware.py`: Middleware to set tenant context automatically
- `/custom_auth/migrations/0012_remove_schema_name.py`: Migration to remove schema_name field

## 5. Testing RLS

Run this test script to verify RLS is working:

```sql
-- Create test table
DROP TABLE IF EXISTS rls_test;

CREATE TABLE rls_test (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL
);

-- Enable RLS with FORCE option
ALTER TABLE rls_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE rls_test FORCE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY tenant_isolation_policy ON rls_test
FOR ALL
TO PUBLIC
USING (
    tenant_id::text = current_setting('app.current_tenant_id', true) 
    OR 
    current_setting('app.current_tenant_id', true) = 'unset'
);

-- Insert test data
INSERT INTO rls_test (tenant_id, name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Tenant 1 - Record 1'),
    ('11111111-1111-1111-1111-111111111111', 'Tenant 1 - Record 2'),
    ('22222222-2222-2222-2222-222222222222', 'Tenant 2 - Record 1'),
    ('22222222-2222-2222-2222-222222222222', 'Tenant 2 - Record 2');

-- Test with tenant 1
SET LOCAL app.current_tenant_id TO '11111111-1111-1111-1111-111111111111';
SELECT * FROM rls_test;
-- Should only show Tenant 1 records

-- Test with tenant 2
SET LOCAL app.current_tenant_id TO '22222222-2222-2222-2222-222222222222';
SELECT * FROM rls_test;
-- Should only show Tenant 2 records

-- Test with unset
SET LOCAL app.current_tenant_id TO 'unset';
SELECT * FROM rls_test;
-- Should show all records
```

## 6. Common RLS Issues and Solutions

1. **RLS Not Working (Seeing All Records)**:
   - Make sure `FORCE ROW LEVEL SECURITY` is enabled on the table
   - Ensure the policy has `FOR ALL TO PUBLIC`
   - Verify the user doesn't have `BYPASSRLS` permission

2. **Permission Errors**:
   - Ensure the database parameter is properly set
   - Make sure the user has ownership of the tables

3. **Django Integration Issues**:
   - Verify middleware is properly registered in settings.py
   - Ensure models inherit from TenantAwareModel

## 7. Drop Tenant Schemas

Once RLS is confirmed working, you can drop the tenant schemas:

```sql
-- Get a list of tenant schemas
SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';

-- Drop each schema
DROP SCHEMA tenant_schema_name CASCADE;
```

## 8. RLS Best Practices

1. Always use `SET LOCAL` for session variables to avoid leaking tenant context
2. Include `FORCE ROW LEVEL SECURITY` to apply RLS to the table owner too
3. Use `FOR ALL TO PUBLIC` in policies to ensure they apply to all operations
4. Always verify RLS is working with test queries before relying on it
5. Keep the middleware enabled to ensure tenant context is automatically set 