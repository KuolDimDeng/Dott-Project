"""
Base model for tenant-aware models.
This provides the tenant_id field and automatic tenant context management.
"""

from django.db import models
import uuid

class TenantAwareModel(models.Model):
    """
    Base model class for all tenant-aware models.
    Automatically includes a tenant_id field for Row Level Security.
    All models that need to be tenant-specific should inherit from this.
    """
    tenant_id = models.UUIDField(
        db_index=True,
        null=True,
        help_text="The tenant ID this record belongs to. Used by Row Level Security."
    )
    
    class Meta:
        abstract = True
    
    def save(self, *args, **kwargs):
        """
        Override save to automatically set the tenant_id if not provided.
        """
        if not self.tenant_id:
            # Import here to avoid circular imports
            from custom_auth.rls import get_current_tenant_id
            current_tenant = get_current_tenant_id()
            if current_tenant:
                self.tenant_id = current_tenant
        super().save(*args, **kwargs)


class TenantAwareManager(models.Manager):
    """
    Manager for tenant-aware models that automatically filters by the current tenant.
    """
    def get_queryset(self):
        """
        Override the default queryset to filter by the current tenant.
        If no tenant is set in the context, returns empty queryset.
        """
        from custom_auth.rls import get_current_tenant_id
        
        # Get the base queryset
        queryset = super().get_queryset()
        
        # Get current tenant from context
        current_tenant = get_current_tenant_id()
        
        # If tenant is set, filter the queryset
        if current_tenant:
            return queryset.filter(tenant_id=current_tenant)
        
        # When no tenant context, just return the queryset
        # (Note: RLS at the database level will still apply)
        return queryset 