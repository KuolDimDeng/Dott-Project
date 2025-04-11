# Model Migration Guide for Row-Level Security (RLS)

This guide provides instructions for migrating your models to use Row-Level Security (RLS) instead of the schema-per-tenant approach.

## 1. Use TenantAwareModel for All Tenant-Specific Models

All models that should be tenant-specific should inherit from `TenantAwareModel` instead of `models.Model`. This ensures:

- The `tenant_id` field is automatically included
- The tenant context is applied when saving new records
- Queries automatically filter by the current tenant

### Example Migration

```python
# Before - schema-based tenant isolation
from django.db import models

class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    # No tenant_id field
```

```python
# After - Row-Level Security
from django.db import models
from custom_auth.tenant_base_model import TenantAwareModel

class Product(TenantAwareModel):  # Changed from models.Model
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    # tenant_id is automatically added
```

## 2. Update Existing Model Instances with tenant_id

After changing your model classes, you'll need to ensure all existing records have a tenant_id set:

```python
from django.core.management.base import BaseCommand
from custom_auth.models import Tenant
from your_app.models import YourModel

class Command(BaseCommand):
    help = 'Migrate existing records to include tenant_id'

    def handle(self, *args, **options):
        # Get all tenants
        tenants = Tenant.objects.all()
        
        for tenant in tenants:
            # Set up the tenant context
            from custom_auth.rls import set_tenant_context
            set_tenant_context(tenant.id)
            
            # Get schema-based models and set tenant_id
            # (You'll need custom logic to identify which records belong to which tenant)
            records = YourModel.objects.filter(tenant_id__isnull=True)
            
            self.stdout.write(f"Updating {records.count()} records for tenant {tenant.name}")
            records.update(tenant_id=tenant.id)
            
            # Clear tenant context
            from custom_auth.rls import clear_tenant_context
            clear_tenant_context()
```

## 3. Replace Schema-Specific Code with RLS Alternatives

1. **Schema Creation**: Remove any code that creates schemas.

2. **Database Functions**: Replace schema-based functions with tenant_id filters:

   ```python
   # Before - schema approach
   def get_customer_data(tenant_schema, customer_id):
       with connection.cursor() as cursor:
           cursor.execute(f'SET search_path TO {tenant_schema}')
           cursor.execute('SELECT * FROM customers WHERE id = %s', [customer_id])
           return cursor.fetchone()
   ```

   ```python
   # After - RLS approach
   def get_customer_data(tenant_id, customer_id):
       from custom_auth.rls import set_tenant_context, clear_tenant_context
       try:
           set_tenant_context(tenant_id)
           return Customer.objects.get(id=customer_id)
       finally:
           clear_tenant_context()
   ```

3. **Raw SQL**: Update any raw SQL to use `tenant_id` filtering:

   ```python
   # Before
   cursor.execute(f'SELECT * FROM {schema_name}.products')
   
   # After
   cursor.execute('SET app.current_tenant_id = %s', [tenant_id])
   cursor.execute('SELECT * FROM products')
   ```

## 4. Middleware for Automatic Tenant Context

The system automatically sets up the tenant context through middleware. Make sure your tenant context is set in all API routes:

```python
from custom_auth.rls import set_tenant_context, clear_tenant_context

def my_api_view(request):
    tenant_id = request.user.tenant_id
    try:
        set_tenant_context(tenant_id)
        # Your code here
        return response
    finally:
        clear_tenant_context()
```

## 5. Testing RLS Policies

You can verify RLS is working by testing different tenant contexts:

```python
from custom_auth.rls import set_tenant_context, clear_tenant_context
from your_app.models import YourModel

# Set tenant context for tenant 1
set_tenant_context('tenant-1-uuid')
tenant1_count = YourModel.objects.count()

# Switch to tenant 2
clear_tenant_context()
set_tenant_context('tenant-2-uuid')
tenant2_count = YourModel.objects.count()

# Records should be isolated between tenants
print(f"Tenant 1: {tenant1_count}, Tenant 2: {tenant2_count}")
```

## 6. Update Client-Side Code

1. Remove all references to schemas from client code
2. Update API routes to use tenant_id instead of schema_name
3. Use the `tenant-manager` API instead of `schema-manager`

## 7. Database Tables

Ensure all tables have:
- A `tenant_id` column
- RLS enabled
- The appropriate RLS policy

Check using:

```sql
SELECT * FROM rls_status;
```

To fix any tables missing RLS:

```sql
-- Enable RLS on a table
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY tenant_isolation_policy ON your_table
USING (tenant_id = (SELECT NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset')::UUID))
WITH CHECK (tenant_id = (SELECT NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset')::UUID));
``` 