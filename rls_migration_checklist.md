# RLS Migration Checklist

This checklist guides you through completing the migration from schema-based tenant isolation to Row-Level Security (RLS) with tenant_id.

## Preparation Phase

- [x] Create tenant_id field in all tenant-specific tables
- [x] Implement TenantAwareModel with automatic tenant_id handling
- [x] Create tenant context management functions
- [x] Add RLS policies to all tenant-specific tables
- [x] Create compatibility middleware for schema_name (SchemaNameMiddleware)
- [x] Make schema_name column nullable in custom_auth_tenant table
- [x] Update Tenant model to mark schema_name as deprecated
- [x] Create comprehensive migration guide (MODEL_MIGRATION_GUIDE.md)

## Code Migration Phase

- [ ] Run `./update_schema_to_tenant_id.py backend/pyfactor --dry-run` to identify code that needs updates
- [ ] Run `./update_schema_to_tenant_id.py backend/pyfactor` to automatically update code
- [ ] Manually review and fix any code that couldn't be automatically updated
- [ ] Update Model classes to inherit from TenantAwareModel
- [ ] Update API routes to set tenant context from request
- [ ] Replace any direct schema references with tenant_id filtering
- [ ] Test all functionality with the new RLS-based approach

## Database Migration Phase

- [ ] Create database backup
- [ ] Run `./final_rls_migration.sh` to:
  - Verify all tenants have RLS enabled
  - Create backup of tenant data
  - Remove schema_name column
  - Create rollback plan

## Post-Migration Phase

- [ ] Remove compatibility middleware
- [ ] Delete schema directories from database (if any still exist)
- [ ] Update documentation to reflect RLS-only approach
- [ ] Create monitoring to verify RLS is working correctly

## Usage Examples

### Setting Tenant Context

```python
from custom_auth.rls import set_current_tenant_id, tenant_context

# Set tenant context for the current connection
set_current_tenant_id(tenant_uuid)

# Or use the context manager
with tenant_context(tenant_uuid):
    # All database operations in this block will be tenant-isolated
    items = Item.objects.all()  # Only returns items for this tenant
```

### Tenant-Aware Models

```python
from custom_auth.tenant_base_model import TenantAwareModel

class Product(TenantAwareModel):
    """Product model that automatically handles tenant isolation"""
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # tenant_id is automatically added by TenantAwareModel
    # All queries are filtered by tenant_id
```

### Manually Setting Tenant Context in SQL Queries

```python
from django.db import connection

def get_tenant_products(tenant_id):
    # Set tenant context for RLS
    with connection.cursor() as cursor:
        cursor.execute("SET app.current_tenant_id = %s", [str(tenant_id)])
        
        # Query will be automatically filtered by RLS
        cursor.execute("SELECT * FROM inventory_product")
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
``` 