from django.db import models
import uuid
from django.conf import settings

class TenantAwareModel(models.Model):
    """
    Base model class that adds tenant_id field to all tenant-specific models.
    Enforces row-level security at the model level.
    """
    tenant_id = models.UUIDField(null=False, blank=False, db_index=True)
    
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        # Get current tenant ID from thread local storage
        from django.db import connection
        
        if not self.tenant_id:
            # Get current tenant from session
            cursor = connection.cursor()
            cursor.execute("SELECT current_setting('app.current_tenant_id', true)")
            result = cursor.fetchone()[0]
            
            if result and result != 'unset':
                self.tenant_id = uuid.UUID(result)
            else:
                # Fallback to default tenant if not set
                self.tenant_id = settings.DEFAULT_TENANT_ID
                
        super().save(*args, **kwargs)
        
class TenantAwareManager(models.Manager):
    """
    Manager for tenant-aware models that automatically filters by tenant.
    """
    def get_queryset(self):
        """Filter by the current tenant ID from the database session"""
        queryset = super().get_queryset()
        from django.db import connection
        
        # Try to get current tenant from database session
        cursor = connection.cursor()
        cursor.execute("SELECT current_setting('app.current_tenant_id', true)")
        result = cursor.fetchone()[0]
        
        if result and result != 'unset':
            tenant_id = uuid.UUID(result)
            return queryset.filter(tenant_id=tenant_id)
        return queryset
    
    def all_tenants(self):
        """Return all records across all tenants. Use with caution."""
        return super().get_queryset() 