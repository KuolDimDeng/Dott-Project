from django.conf import settings
import threading

local = threading.local()

class TenantSchemaRouter:
    """
    Database router for schema-based multi-tenancy.
    Routes database operations to the appropriate schema based on the current tenant.
    """
    
    def _get_tenant_schema(self):
        """Get current tenant schema from thread local storage"""
        schema = getattr(local, 'tenant_schema', None)
        return schema if schema else 'public'
    
    def _set_tenant_schema(self, schema_name):
        """Set current tenant schema in thread local storage"""
        setattr(local, 'tenant_schema', schema_name)
    
    def _is_tenant_model(self, model):
        """Check if model belongs to tenant-specific apps"""
        tenant_apps = getattr(settings, 'TENANT_APPS', [])
        return model._meta.app_label in tenant_apps
    
    def _is_shared_model(self, model):
        """Check if model belongs to shared apps"""
        shared_apps = getattr(settings, 'SHARED_APPS', [])
        return model._meta.app_label in shared_apps
    def db_for_read(self, model, **hints):
        """
        Route read operations to the appropriate schema.
        Tenant-specific models go to tenant schema, shared models to public schema.
        """
        # Always use public schema for onboarding-related models
        if model._meta.app_label in ['onboarding', 'business'] and not getattr(model, 'is_tenant_specific', False):
            return 'default'
        
        if self._is_tenant_model(model):
            schema = self._get_tenant_schema()
            return schema if schema else 'default'
        elif self._is_shared_model(model):
            return 'default'
        return None
        return None
    
    def db_for_write(self, model, **hints):
        """
        Route write operations to the appropriate schema.
        Tenant-specific models go to tenant schema, shared models to public schema.
        """
        # Always use public schema for onboarding-related models
        if model._meta.app_label in ['onboarding', 'business'] and not getattr(model, 'is_tenant_specific', False):
            return 'default'
        
        if self._is_tenant_model(model):
            schema = self._get_tenant_schema()
            return schema if schema else 'default'
        elif self._is_shared_model(model):
            return 'default'
        return None
    
    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations between models in the same schema or between shared models.
        """
        # Allow relations between shared models
        if self._is_shared_model(obj1.__class__) and self._is_shared_model(obj2.__class__):
            return True
            
        # Allow relations between tenant models in the same schema
        if self._is_tenant_model(obj1.__class__) and self._is_tenant_model(obj2.__class__):
            return True
            
        # Allow relations between tenant and shared models
        if (self._is_tenant_model(obj1.__class__) and self._is_shared_model(obj2.__class__)) or \
           (self._is_shared_model(obj1.__class__) and self._is_tenant_model(obj2.__class__)):
            return True
            
        return None
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Control which models get synchronized to which schemas.
        """
        # Always allow migrations in the public schema
        if db == 'default':
            return True
            
        # For tenant schemas, only allow tenant app migrations
        tenant_apps = getattr(settings, 'TENANT_APPS', [])
        if app_label in tenant_apps:
            return True
            
        return False 