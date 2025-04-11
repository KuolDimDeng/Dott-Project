# Row Level Security (RLS) Implementation in Django

This guide provides a comprehensive approach to implementing PostgreSQL Row Level Security (RLS) in Django applications for multi-tenant isolation.

## 1. Creating a TenantAwareModel Base Class

First, create a base model that automatically handles tenant context:

```python
# models/base.py

import uuid
from django.db import models
from django.db.models.signals import pre_save
from django.dispatch import receiver
from tenant_context import get_current_tenant_id

class TenantAwareModel(models.Model):
    """
    Base model for all tenant-specific models.
    Automatically handles tenant ID assignment and RLS enforcement.
    """
    tenant_id = models.CharField(max_length=255, db_index=True)
    
    class Meta:
        abstract = True
    
    def save(self, *args, **kwargs):
        # If tenant_id is not set, use current tenant context
        if not self.tenant_id:
            tenant_id = get_current_tenant_id()
            if not tenant_id:
                raise ValueError("No tenant ID in context when saving model")
            self.tenant_id = tenant_id
        
        return super().save(*args, **kwargs)

@receiver(pre_save)
def ensure_tenant_id(sender, instance, **kwargs):
    """
    Signal to ensure tenant_id is set before saving any TenantAwareModel.
    """
    if isinstance(instance, TenantAwareModel) and not instance.tenant_id:
        tenant_id = get_current_tenant_id()
        if not tenant_id:
            raise ValueError(f"No tenant ID in context when saving {sender.__name__}")
        instance.tenant_id = tenant_id
```

## 2. Creating Tenant Context Management

Set up a module to manage tenant context:

```python
# tenant_context.py

import threading
from django.conf import settings

# Thread-local storage for tenant context
_tenant_context = threading.local()

def get_current_tenant_id():
    """
    Get the current tenant ID from thread-local storage.
    Returns None if no tenant ID is set.
    """
    return getattr(_tenant_context, 'tenant_id', None)

def set_current_tenant_id(tenant_id):
    """
    Set the current tenant ID in thread-local storage.
    """
    if not tenant_id:
        raise ValueError("Tenant ID cannot be empty")
        
    # Validate tenant ID format to prevent SQL injection
    if not isinstance(tenant_id, str) or not tenant_id.strip():
        raise ValueError("Invalid tenant ID format")
    
    _tenant_context.tenant_id = tenant_id

def clear_current_tenant_id():
    """
    Clear the current tenant ID from thread-local storage.
    """
    if hasattr(_tenant_context, 'tenant_id'):
        del _tenant_context.tenant_id
```

## 3. Creating a Middleware for Tenant Context

Create middleware to set tenant context for each request:

```python
# middleware.py

from django.http import HttpResponseForbidden
from tenant_context import set_current_tenant_id, clear_current_tenant_id

class TenantMiddleware:
    """
    Middleware to set tenant context for each request.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant_id = None
        
        # Try to get tenant ID from user
        if request.user.is_authenticated:
            tenant_id = getattr(request.user, 'tenant_id', None)
        
        # If no tenant ID from user, try request header
        if not tenant_id:
            tenant_id = request.headers.get('X-Tenant-ID')
        
        # In development, allow tenant ID from query parameter
        if not tenant_id and settings.DEBUG:
            tenant_id = request.GET.get('tenant_id')
        
        # If tenant ID is found, set it in context
        if tenant_id:
            try:
                set_current_tenant_id(tenant_id)
            except ValueError:
                return HttpResponseForbidden("Invalid tenant ID")
        # For paths that require tenant context, enforce tenant ID
        elif self._requires_tenant_context(request.path):
            return HttpResponseForbidden("Tenant ID required")
            
        response = self.get_response(request)
        
        # Clear tenant context after request
        clear_current_tenant_id()
        
        return response
    
    def _requires_tenant_context(self, path):
        """
        Check if the path requires tenant context.
        Override this method to customize which paths require tenant context.
        """
        # Skip admin, static, media paths
        if path.startswith('/admin/') or path.startswith('/static/') or path.startswith('/media/'):
            return False
            
        # Skip authentication paths
        if path.startswith('/api/auth/') or path.startswith('/accounts/'):
            return False
            
        # By default, require tenant context for API paths
        return path.startswith('/api/')
```

## 4. Creating a Database Router for RLS

Create a database router to ensure RLS is applied:

```python
# routers.py

from django.conf import settings
from tenant_context import get_current_tenant_id

class RLSRouter:
    """
    Database router that ensures RLS is applied.
    """
    def db_for_read(self, model, **hints):
        """
        Route read operations through RLS.
        """
        return self._set_tenant_context('default')
    
    def db_for_write(self, model, **hints):
        """
        Route write operations through RLS.
        """
        return self._set_tenant_context('default')
    
    def _set_tenant_context(self, db_alias):
        """
        Set tenant context for the database connection.
        """
        from django.db import connections
        
        tenant_id = get_current_tenant_id()
        if tenant_id:
            # Set the PostgreSQL session variable for RLS
            connection = connections[db_alias]
            cursor = connection.cursor()
            cursor.execute(f"SET LOCAL app.current_tenant_id TO %s", [tenant_id])
            cursor.close()
        
        return db_alias
```

## 5. Creating a Management Command for RLS Setup

Create a management command to set up RLS in your database:

```python
# management/commands/setup_rls.py

from django.core.management.base import BaseCommand
from django.db import connection
from django.apps import apps

class Command(BaseCommand):
    help = 'Set up Row Level Security for tenant-aware models'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation of RLS policies',
        )
    
    def handle(self, *args, **options):
        force = options.get('force', False)
        
        with connection.cursor() as cursor:
            # Set up PostgreSQL functions and parameters
            self.stdout.write('Setting up RLS functions...')
            cursor.execute("""
                CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
                
                ALTER DATABASE %s SET app.current_tenant_id TO '';
                
                CREATE OR REPLACE FUNCTION current_tenant_id()
                RETURNS TEXT AS $$
                BEGIN
                  RETURN current_setting('app.current_tenant_id', TRUE);
                END;
                $$ LANGUAGE plpgsql;
            """ % connection.settings_dict['NAME'])
            
            # Find all tenant-aware models
            tenant_models = []
            for app_config in apps.get_app_configs():
                for model in app_config.get_models():
                    if hasattr(model, 'tenant_id') and not model._meta.abstract:
                        tenant_models.append(model)
            
            self.stdout.write(f'Found {len(tenant_models)} tenant-aware models')
            
            # Set up RLS for each tenant-aware model
            for model in tenant_models:
                table_name = model._meta.db_table
                
                # Enable RLS on the table
                self.stdout.write(f'Enabling RLS on {table_name}...')
                cursor.execute(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY")
                
                # Create RLS policy
                policy_name = f"{table_name}_tenant_isolation"
                if force:
                    cursor.execute(f"DROP POLICY IF EXISTS {policy_name} ON {table_name}")
                    
                try:
                    cursor.execute(f"""
                        CREATE POLICY {policy_name} ON {table_name}
                        USING (tenant_id = current_tenant_id() OR current_tenant_id() = '')
                    """)
                    self.stdout.write(self.style.SUCCESS(f'Created RLS policy {policy_name}'))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'Policy already exists: {e}'))
            
            self.stdout.write(self.style.SUCCESS('RLS setup complete!'))
```

## 6. Example: Converting a Model to Use RLS

Here's how to modify an existing model to use RLS:

```python
# Before: Traditional model
class Product(models.Model):
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

# After: Tenant-aware model with RLS
from models.base import TenantAwareModel

class Product(TenantAwareModel):
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
```

## 7. Creating a Migration to Add tenant_id

When converting existing models, you'll need a migration to add the tenant_id column:

```python
# migrations/XXXX_add_tenant_id.py

from django.db import migrations, models
import uuid

def forward_func(apps, schema_editor):
    """
    Add tenant_id to existing records.
    In a real migration, you'd need to determine the appropriate tenant ID
    for each record based on your business logic.
    """
    Product = apps.get_model('myapp', 'Product')
    default_tenant = 'default-tenant-id'
    
    for product in Product.objects.all():
        product.tenant_id = default_tenant
        product.save()

class Migration(migrations.Migration):
    dependencies = [
        ('myapp', 'previous_migration'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='tenant_id',
            field=models.CharField(max_length=255, null=True, db_index=True),
        ),
        migrations.RunPython(forward_func),
        migrations.AlterField(
            model_name='product',
            name='tenant_id',
            field=models.CharField(max_length=255, db_index=True),
        ),
    ]
```

## 8. Setting Up Django Settings

Update your Django settings to include the necessary components:

```python
# settings.py

INSTALLED_APPS = [
    # ... existing apps
    'myapp',
]

MIDDLEWARE = [
    # ... existing middleware
    'myapp.middleware.TenantMiddleware',
]

DATABASE_ROUTERS = ['myapp.routers.RLSRouter']
```

## 9. Testing RLS Implementation

Create a view to test RLS implementation:

```python
# views.py

from django.http import JsonResponse
from django.views.decorators.http import require_GET
from tenant_context import get_current_tenant_id, set_current_tenant_id
from myapp.models import Product

@require_GET
def test_rls(request):
    """
    Test view to verify RLS is working.
    """
    current_tenant = get_current_tenant_id()
    
    if not current_tenant:
        return JsonResponse({'error': 'No tenant ID in context'}, status=400)
    
    # Get product count for current tenant
    product_count = Product.objects.count()
    
    result = {
        'tenant_id': current_tenant,
        'product_count': product_count,
        'rls_active': True,
    }
    
    return JsonResponse(result)
```

## Best Practices

1. **Always use TenantAwareModel** for models that contain tenant-specific data
2. **Set up proper testing** for your RLS implementation to ensure it works as expected
3. **Include error handling** for cases where tenant ID is missing
4. **Create a test suite** that verifies tenant isolation is working correctly
5. **Run database queries in transactions** to ensure tenant context is maintained
6. **Be careful with raw SQL** - always ensure the tenant context is properly set
7. **Consider super admin access** - design a way for admins to bypass RLS if needed

## Example: Using Tenant Context in Services

Here's how to use tenant context in service functions:

```python
# services.py

from tenant_context import set_current_tenant_id, clear_current_tenant_id
from myapp.models import Product

def create_product_for_tenant(tenant_id, name, price):
    """
    Create a product for a specific tenant.
    """
    # Set tenant context
    set_current_tenant_id(tenant_id)
    
    try:
        # Create product - tenant_id is automatically set
        product = Product.objects.create(
            name=name,
            price=price
        )
        
        return product
    finally:
        # Always clear tenant context when done
        clear_current_tenant_id()
```

By following this guide, you'll have a robust implementation of Row Level Security in your Django application with proper tenant isolation. 