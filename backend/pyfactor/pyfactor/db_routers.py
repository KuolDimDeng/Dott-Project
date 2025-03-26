from django.conf import settings
import threading
import logging
import time
import os
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
        # Added detailed debug logging for dynamic table creation
        logger.debug(f"[DYNAMIC-TABLE] db_for_read: Checking table for {model._meta.app_label}.{model._meta.model_name}")
        
        # Always use public schema for onboarding-related models and business models
        if model._meta.app_label in ['onboarding', 'business'] and not getattr(model, 'is_tenant_specific', False):
            logger.debug(f"Routing read for {model._meta.app_label}.{model._meta.model_name} to public schema")
            # Use optimized connection with public schema
            self._get_optimized_connection('public')
            return 'default'
        
        if self._is_tenant_model(model):
            # Get current tenant schema
            schema = self._get_tenant_schema()
            logger.debug(f"[DYNAMIC-TABLE] Routing read for tenant model {model._meta.app_label}.{model._meta.model_name} to schema {schema}")
            
            # Check if table exists in tenant schema and create it if needed
            self._ensure_table_exists(schema, model)
            
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
        # Added detailed debug logging for dynamic table creation
        logger.debug(f"[DYNAMIC-TABLE] db_for_write: Checking table for {model._meta.app_label}.{model._meta.model_name}")
        
        # Always use public schema for onboarding-related models and business models
        if model._meta.app_label in ['onboarding', 'business'] and not getattr(model, 'is_tenant_specific', False):
            logger.debug(f"Routing write for {model._meta.app_label}.{model._meta.model_name} to public schema")
            # Use optimized connection with public schema
            self._get_optimized_connection('public')
            return 'default'
        
        if self._is_tenant_model(model):
            # Get current tenant schema
            schema = self._get_tenant_schema()
            logger.debug(f"[DYNAMIC-TABLE] Routing write for tenant model {model._meta.app_label}.{model._meta.model_name} to schema {schema}")
            
            # Check if table exists in tenant schema and create it if needed
            self._ensure_table_exists(schema, model)
            
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
    
    def _ensure_table_exists(self, schema_name, model):
        """
        Ensure that the table exists in the given schema for the model.
        If it doesn't exist, create it dynamically.
        """
        if schema_name == 'public':
            # No need to create tables in public schema, they should be there already
            return
            
        # Generate a request ID for tracking in logs
        request_id = os.urandom(4).hex()
        
        # Get table name
        table_name = model._meta.db_table
        
        # Check if table exists
        try:
            connection = connections['default']
            with connection.cursor() as cursor:
                logger.debug(f"[DYNAMIC-TABLE-{request_id}] Checking if table {table_name} exists in schema {schema_name}")
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = %s AND table_name = %s
                    )
                """, [schema_name, table_name])
                
                table_exists = cursor.fetchone()[0]
                
                if not table_exists:
                    logger.info(f"[DYNAMIC-TABLE-{request_id}] Table {table_name} does not exist in schema {schema_name}, creating it dynamically")
                    
                    # Import here to avoid circular import
                    from onboarding.utils import create_table_from_model
                    
                    # Set schema context
                    cursor.execute(f'SET search_path TO "{schema_name}"')
                    
                    # Create table
                    try:
                        create_table_from_model(cursor, schema_name, model)
                        logger.info(f"[DYNAMIC-TABLE-{request_id}] Successfully created table {table_name} in schema {schema_name}")
                    except Exception as e:
                        logger.error(f"[DYNAMIC-TABLE-{request_id}] Error creating table {table_name} in schema {schema_name}: {str(e)}")
                else:
                    logger.debug(f"[DYNAMIC-TABLE-{request_id}] Table {table_name} already exists in schema {schema_name}")
        except Exception as e:
            logger.error(f"[DYNAMIC-TABLE-{request_id}] Error checking/creating table {table_name} in schema {schema_name}: {str(e)}")
    
    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations between objects in the same schema.
        For multi-tenant, we need to determine if objects are in the same schema.
        """
        return True
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Control which models get synchronized to which schemas.
        
        This method determines whether a migration for a specific app should be
        applied to a specific database connection. For tenant apps, migrations
        should only be applied to tenant schemas, not to the public schema.
        """
        from django.conf import settings
        
        # Skip migration checks for problematic apps
        # Return None to let Django's default behavior handle these apps
        if app_label in ['business', 'finance', 'hr', 'crm', 'transport', 'auth']:  # Added 'auth' here
            logger.debug(f"Skipping migration check for {app_label} app (special case)")
            return None
            
        # Get the current schema from thread local storage
        current_schema = self._get_tenant_schema()
        tenant_apps = getattr(settings, 'TENANT_APPS', [])
        shared_apps = getattr(settings, 'SHARED_APPS', [])
        
        # Check if this is a migration operation
        is_migration_operation = hints.get('operation_type') == 'migration'
        
        # Special handling for django_migrations table
        if model_name == 'migration' and app_label == 'migrations':
            # Allow django_migrations table to be created in all schemas
            return True
        
        # Handle tenant-specific apps
        if app_label in tenant_apps:
            # Always allow migrations for initial tables, but not for dynamic ones 
            # when migrating in public schema
            if current_schema == 'public':
                logger.debug(f"Not allowing migration for {app_label} in {current_schema}")
                return False
            
            # For tenant schema, only allow initial migrations, not dynamic ones
            # This will be handled by the _ensure_table_exists method
            is_initial_migration = hints.get('is_initial', False)
            logger.debug(f"Migration for tenant app {app_label} in schema {current_schema}: {is_initial_migration}")
            return is_initial_migration
        
        # Allow migrations for shared apps in public schema
        if app_label in shared_apps and current_schema == 'public':
            logger.debug(f"Allowing migration for shared app {app_label} in {current_schema}")
            return True
        
        # Default behavior for other apps
        logger.debug(f"Default migration behavior for app {app_label} in schema {current_schema}: {app_label not in tenant_apps}")
        return app_label not in tenant_apps
        
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