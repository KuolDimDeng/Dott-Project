# Row Level Security (RLS) Implementation

This document outlines the implementation of Row Level Security (RLS) for multi-tenant isolation in the application.

## Overview

We've implemented a row-level tenant isolation strategy using PostgreSQL's Row Level Security feature. This approach ensures that data belonging to one tenant cannot be accessed by another tenant, even if the application code fails to filter queries properly.

## Key Components

### 1. Model Structure

The `TenantAwareModel` base class provides a foundation for all tenant-specific models:

```python
class TenantAwareModel(models.Model):
    tenant_id = models.UUIDField(null=False, blank=False, db_index=True)
    
    class Meta:
        abstract = True
        
    def save(self, *args, **kwargs):
        # Automatically set tenant_id from context if not provided
        if not self.tenant_id:
            current_tenant = get_current_tenant()
            if current_tenant:
                self.tenant_id = current_tenant
        super().save(*args, **kwargs)
```

### 2. Database Session Variables

We use PostgreSQL session variables to track the current tenant context:

```sql
SET app.current_tenant_id = 'tenant-uuid-here';
```

### 3. Row Level Security Policies

RLS policies are applied to each tenant-aware table:

```sql
-- Enable RLS on the table
ALTER TABLE banking_bankaccount ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation_policy ON banking_bankaccount
FOR ALL
USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Create policy for admin access
CREATE POLICY admin_access_policy ON banking_bankaccount
FOR ALL
TO admin
USING (true);
```

### 4. Tenant Context Management

Tenant context is managed through thread-local storage and database sessions:

```python
def set_current_tenant(tenant_id):
    # Set in thread-local storage
    setattr(_thread_local, 'tenant_id', tenant_id)
    
    # Set in database session
    cursor = connection.cursor()
    cursor.execute(f"SET app.current_tenant_id = '{tenant_id}'")
```

### 5. Middleware

The `TenantMiddleware` automatically sets the tenant context for each request based on the authenticated user:

```python
class TenantMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Clear any existing tenant context
        clear_current_tenant()
        
        # Skip for anonymous users
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return
        
        # Get tenant from user
        tenant_id = getattr(request.user, 'tenant_id', None)
        
        if tenant_id:
            set_current_tenant(tenant_id)
```

### 6. Tenant-Aware Managers

Model managers filter by tenant automatically:

```python
class TenantAwareManager(models.Manager):
    def get_queryset(self):
        queryset = super().get_queryset()
        current_tenant = get_current_tenant()
        if current_tenant:
            queryset = queryset.filter(tenant_id=current_tenant)
        return queryset
        
    def all_tenants(self):
        return super().get_queryset()
```

## Usage Examples

### 1. Defining Tenant-Aware Models

```python
from custom_auth.tenant_base_model import TenantAwareModel, TenantAwareManager

class BankAccount(TenantAwareModel):
    name = models.CharField(max_length=255)
    # ... other fields
    
    # Add tenant-aware manager
    objects = TenantAwareManager()
    # Add all_objects manager for admin operations
    all_objects = models.Manager()
```

### 2. Setting Tenant Context in Views

```python
@tenant_context
def my_view(request):
    # Tenant context is automatically set by the decorator
    accounts = BankAccount.objects.all()  # Only returns current tenant's accounts
    return render(request, 'template.html', {'accounts': accounts})
```

### 3. Admin Access

Admin users can access data across all tenants:

```python
@admin_or_tenant_required
def admin_view(request):
    if request.user.is_staff:
        # For admin users, show all accounts across tenants
        accounts = BankAccount.all_objects.all()
    else:
        # For regular users, just show their tenant's accounts
        accounts = BankAccount.objects.all()
```

## Database Views

For reporting and complex queries, we've created tenant-aware database views:

```sql
CREATE OR REPLACE VIEW banking_account_view AS
SELECT
    ba.id,
    ba.name,
    ba.account_number,
    -- ... other fields
    ba.tenant_id,
    u.email as user_email,
    t.name as tenant_name
FROM
    banking_bankaccount ba
LEFT JOIN
    custom_auth_user u ON ba.user_id = u.id
LEFT JOIN
    custom_auth_tenant t ON ba.tenant_id = t.id
WHERE
    ba.tenant_id::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.current_tenant_id', true) = 'unset';
```

## Testing

Tenant isolation can be tested using the `TenantIsolationTest` class, which verifies:

1. Each tenant can only see their own data
2. Admin users can access data across all tenants
3. Newly created data is correctly associated with the current tenant

## Limitations

1. Raw SQL queries need to be carefully written to respect tenant isolation
2. Bulk updates/creates need extra attention to ensure tenant_id is set
3. Performance impact on very large datasets (mitigated by indexes)

## Security Considerations

1. Always set the tenant context before performing database operations
2. Use the provided decorators and middleware to maintain context
3. Be cautious when using `all_tenants()` methods or direct SQL
4. Admin access should be tightly controlled 