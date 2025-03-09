from django.conf import settings
import threading
import logging
import time
from django.db import connections

logger = logging.getLogger(__name__)
local = threading.local()

# Connection pool cache to avoid repeated schema switching
connection_cache = {}

class TenantSchemaRouter:
    """
    Database router for schema-based multi-tenancy.
    Routes database operations to the appropriate schema based on the current tenant.
    """
    
    def _get_tenant_schema(self):
        """Get current tenant schema from thread local storage"""
        schema = getattr(local, 'tenant_schema', None)
        if not schema:
            schema = 'public'
            logger.debug(f"No tenant schema found in thread local, defaulting to: {schema}")
        else:
            logger.debug(f"Using tenant schema from thread local: {schema}")
        return schema
    
    def _set_tenant_schema(self, schema_name):
        """Set current tenant schema in thread local storage"""
        logger.debug(f"Setting thread local tenant schema to: {schema_name}")
        setattr(local, 'tenant_schema', schema_name)
    
    def _get_optimized_connection(self, schema_name=None):
        """Get an optimized database connection with the correct schema set"""
        if not schema_name:
            schema_name = self._get_tenant_schema()
            
        # Check if we have a cached connection for this schema
        cache_key = f"connection_{schema_name}"
        if cache_key in connection_cache:
            logger.debug(f"Using cached connection for schema: {schema_name}")
            return connection_cache[cache_key]
            
        # Get the default connection
        connection = connections['default']
        
        # Set the search path for this connection
        start_time = time.time()
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema_name}",public')
            logger.debug(f"Set search path to {schema_name} in {time.time() - start_time:.4f}s")
            
        # Cache the connection
        connection_cache[cache_key] = connection
        return connection
    
    def _is_tenant_model(self, model):
        """Check if model belongs to tenant-specific apps"""
        tenant_apps = getattr(settings, 'TENANT_APPS', [])
        is_tenant = model._meta.app_label in tenant_apps
        if is_tenant:
            logger.debug(f"Model {model._meta.app_label}.{model._meta.model_name} is a tenant model")
        return is_tenant
    
    def _is_shared_model(self, model):
        """Check if model belongs to shared apps"""
        shared_apps = getattr(settings, 'SHARED_APPS', [])
        is_shared = model._meta.app_label in shared_apps
        if is_shared:
            logger.debug(f"Model {model._meta.app_label}.{model._meta.model_name} is a shared model")
        return is_shared
        
    def db_for_read(self, model, **hints):
        """
        Route read operations to the appropriate schema.
        Tenant-specific models go to tenant schema, shared models to public schema.
        """
        # Always use public schema for onboarding-related models
        if model._meta.app_label in ['onboarding', 'business'] and not getattr(model, 'is_tenant_specific', False):
            logger.debug(f"Routing read for {model._meta.app_label}.{model._meta.model_name} to public schema")
            # Use optimized connection with public schema
            self._get_optimized_connection('public')
            return 'default'
        
        if self._is_tenant_model(model):
            # Get current tenant schema
            schema = self._get_tenant_schema()
            logger.debug(f"Routing read for tenant model {model._meta.app_label}.{model._meta.model_name} to schema {schema}")
            
            # Use optimized connection with tenant schema
            if schema != 'public':
                self._get_optimized_connection(schema)
            
            return 'default'
        elif self._is_shared_model(model):
            logger.debug(f"Routing read for shared model {model._meta.app_label}.{model._meta.model_name} to public schema")
            # Use optimized connection with public schema
            self._get_optimized_connection('public')
            return 'default'
            
        logger.debug(f"No specific routing for {model._meta.app_label}.{model._meta.model_name}, using default schema")
        return 'default'
    
    def db_for_write(self, model, **hints):
        """
        Route write operations to the appropriate schema.
        Tenant-specific models go to tenant schema, shared models to public schema.
        """
        # Always use public schema for onboarding-related models
        if model._meta.app_label in ['onboarding', 'business'] and not getattr(model, 'is_tenant_specific', False):
            logger.debug(f"Routing write for {model._meta.app_label}.{model._meta.model_name} to public schema")
            # Use optimized connection with public schema
            self._get_optimized_connection('public')
            return 'default'
        
        if self._is_tenant_model(model):
            # Get current tenant schema
            schema = self._get_tenant_schema()
            logger.debug(f"Routing write for tenant model {model._meta.app_label}.{model._meta.model_name} to schema {schema}")
            
            # Use optimized connection with tenant schema
            if schema != 'public':
                self._get_optimized_connection(schema)
                
            return 'default'
        elif self._is_shared_model(model):
            logger.debug(f"Routing write for shared model {model._meta.app_label}.{model._meta.model_name} to public schema")
            # Use optimized connection with public schema
            self._get_optimized_connection('public')
            return 'default'
            
        logger.debug(f"No specific routing for {model._meta.app_label}.{model._meta.model_name}, using default schema")
        return 'default'
    
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
        
    @classmethod
    def clear_connection_cache(cls):
        """Clear the connection cache to force new connections"""
        global connection_cache
        logger.debug(f"Clearing connection cache with {len(connection_cache)} entries")
        connection_cache = {}
        
    @classmethod
    def get_connection_for_schema(cls, schema_name):
        """Get a connection for a specific schema (utility method)"""
        router = cls()
        return router._get_optimized_connection(schema_name)