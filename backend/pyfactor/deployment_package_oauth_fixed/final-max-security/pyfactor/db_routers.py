from django.conf import settings
import threading
import logging
import time
import os
import uuid
from django.db import connections

logger = logging.getLogger(__name__)
local = threading.local()

# Connection pool cache to avoid repeated tenant switching
connection_cache = {}

class TenantRouter:
    """
    Database router for Row-Level Security (RLS) multi-tenancy.
    Routes database operations to the appropriate tenant based on the current tenant ID.
    """
    
    def _get_tenant_id(self):
        """Get current tenant ID from thread local storage"""
        tenant_id = getattr(local, 'tenant_id', None)
        if not tenant_id:
            tenant_id = None
            logger.debug(f"No tenant ID found in thread local, defaulting to public schema")
        else:
            logger.debug(f"Using tenant ID from thread local: {tenant_id}")
        return tenant_id
    
    def _set_tenant_context(self, tenant_id):
        """Set current tenant ID in thread local storage"""
        logger.debug(f"Setting thread local tenant ID to: {tenant_id}")
        setattr(local, 'tenant_id', tenant_id)
    
    def _get_optimized_connection_for_tenant(self, tenant_id=None):
        """Get an optimized database connection with the correct tenant context set"""
        if not tenant_id:
            tenant_id = self._get_tenant_id()
            
        # Check if we have a cached connection for this tenant
        cache_key = f"connection_{tenant_id}" if tenant_id else "connection_public"
        if cache_key in connection_cache:
            logger.debug(f"Using cached connection for tenant: {tenant_id}")
            return connection_cache[cache_key]
            
        # Get the default connection
        connection = connections['default']
        
        # Set the tenant context for this connection
        start_time = time.time()
        with connection.cursor() as cursor:
            # Set the tenant ID for RLS filtering
            if tenant_id:
                set_current_tenant_id(tenant_id)
                logger.debug(f"Set tenant context to {tenant_id} in {time.time() - start_time:.4f}s")
            else:
                # Reset to public context
                set_current_tenant_id(None)
                logger.debug(f"Reset to public context in {time.time() - start_time:.4f}s")
            
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
        Route read operations to the appropriate tenant.
        Tenant-specific models use the current tenant context, shared models use public.
        """
        # Added detailed debug logging for dynamic table creation
        logger.debug(f"[DYNAMIC-TABLE] db_for_read: Checking table for {model._meta.app_label}.{model._meta.model_name}")
        
        # Always use public context for onboarding-related models and business models
        if model._meta.app_label in ['onboarding', 'business'] and not getattr(model, 'is_tenant_specific', False):
            logger.debug(f"Routing read for {model._meta.app_label}.{model._meta.model_name} to public context")
            # Use optimized connection with public context
            self._get_optimized_connection_for_tenant(None)
            return 'default'
        
        if self._is_tenant_model(model):
            # Get current tenant ID
            tenant_id = self._get_tenant_id()
            logger.debug(f"[DYNAMIC-TABLE] Routing read for tenant model {model._meta.app_label}.{model._meta.model_name} with tenant ID {tenant_id}")
            
            # Check if table exists for tenant and create it if needed
            if tenant_id:
                self._ensure_table_exists_for_tenant(tenant_id, model)
                
                # Use optimized connection with tenant context
                self._get_optimized_connection_for_tenant(tenant_id)
            
            return 'default'
        elif self._is_shared_model(model):
            logger.debug(f"Routing read for shared model {model._meta.app_label}.{model._meta.model_name} to public context")
            # Use optimized connection with public context
            self._get_optimized_connection_for_tenant(None)
            return 'default'
            
        logger.debug(f"No specific routing for {model._meta.app_label}.{model._meta.model_name}, using default context")
        return 'default'
    
    def db_for_write(self, model, **hints):
        """
        Route write operations to the appropriate tenant.
        Tenant-specific models use the current tenant context, shared models use public.
        """
        # Added detailed debug logging for dynamic table creation
        logger.debug(f"[DYNAMIC-TABLE] db_for_write: Checking table for {model._meta.app_label}.{model._meta.model_name}")
        
        # Always use public context for onboarding-related models and business models
        if model._meta.app_label in ['onboarding', 'business'] and not getattr(model, 'is_tenant_specific', False):
            logger.debug(f"Routing write for {model._meta.app_label}.{model._meta.model_name} to public context")
            # Use optimized connection with public context
            self._get_optimized_connection_for_tenant(None)
            return 'default'
        
        if self._is_tenant_model(model):
            # Get current tenant ID
            tenant_id = self._get_tenant_id()
            logger.debug(f"[DYNAMIC-TABLE] Routing write for tenant model {model._meta.app_label}.{model._meta.model_name} with tenant ID {tenant_id}")
            
            # Check if table exists for tenant and create it if needed
            if tenant_id:
                self._ensure_table_exists_for_tenant(tenant_id, model)
                
                # Use optimized connection with tenant context
                self._get_optimized_connection_for_tenant(tenant_id)
            
            return 'default'
        elif self._is_shared_model(model):
            logger.debug(f"Routing write for shared model {model._meta.app_label}.{model._meta.model_name} to public context")
            # Use optimized connection with public context
            self._get_optimized_connection_for_tenant(None)
            return 'default'
            
        logger.debug(f"No specific routing for {model._meta.app_label}.{model._meta.model_name}, using default context")
        return 'default'
    
    def _ensure_table_exists_for_tenant(self, tenant_id, model):
        """
        Ensure that the table exists for the given tenant.
        If it doesn't exist, create it dynamically with proper RLS policies.
        """
        if not tenant_id:
            # No need to create tables in public context, they should be there already
            return
            
        # Generate a request ID for tracking in logs
        request_id = os.urandom(4).hex()
        
        # Get table name
        table_name = model._meta.db_table
        
        # Legacy schema name for compatibility with existing tables
        legacy_schema_name = f"tenant_{tenant_id}".replace('-', '')
        
        # Check if table exists
        try:
            connection = connections['default']
            with connection.cursor() as cursor:
                logger.debug(f"[DYNAMIC-TABLE-{request_id}] Checking if table {table_name} exists for tenant {tenant_id}")
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = %s
                    )
                """, [table_name])
                
                table_exists = cursor.fetchone()[0]
                
                if not table_exists:
                    logger.info(f"[DYNAMIC-TABLE-{request_id}] Table {table_name} does not exist for tenant {tenant_id}, creating it dynamically")
                    
                    # Import here to avoid circular import
                    from onboarding.utils import create_table_for_model
                    
                    # Set tenant context
                    set_current_tenant_id(tenant_id)
                    
                    # Create table
                    try:
                        create_table_for_model(cursor, tenant_id, model)
                        logger.info(f"[DYNAMIC-TABLE-{request_id}] Successfully created table {table_name} for tenant {tenant_id}")
                    except Exception as e:
                        logger.error(f"[DYNAMIC-TABLE-{request_id}] Error creating table {table_name} for tenant {tenant_id}: {str(e)}")
                else:
                    logger.debug(f"[DYNAMIC-TABLE-{request_id}] Table {table_name} already exists")
        except Exception as e:
            logger.error(f"[DYNAMIC-TABLE-{request_id}] Error checking/creating table {table_name} for tenant {tenant_id}: {str(e)}")
    
    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations between objects within the same tenant context.
        With RLS, objects are filtered by tenant_id at the database level,
        so this is primarily for consistency checking.
        """
        return True
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Control which models get synchronized to which database.
        
        This method determines whether a migration for a specific app should be
        applied to a specific database connection. For tenant apps with RLS,
        migrations should only be applied to public schema with tenant context.
        """
        from django.conf import settings
        
        # Skip migration checks for problematic apps
        # Return None to let Django's default behavior handle these apps
        if app_label in ['business', 'finance', 'hr', 'crm', 'transport', 'auth']:  # Added 'auth' here
            logger.debug(f"Skipping migration check for {app_label} app (special case)")
            return None
            
        # Get the current tenant ID from thread local storage
        current_tenant_id = self._get_tenant_id()
        tenant_apps = getattr(settings, 'TENANT_APPS', [])
        shared_apps = getattr(settings, 'SHARED_APPS', [])
        
        # Check if this is a migration operation
        is_migration_operation = hints.get('operation_type') == 'migration'
        
        # Special handling for django_migrations table
        if model_name == 'migration' and app_label == 'migrations':
            # Allow django_migrations table to be created in the database
            return True
        
        # Handle tenant-specific apps
        if app_label in tenant_apps:
            # For tenant models with RLS, migrations should be applied to public schema
            # with proper tenant_id column. Dynamic tables are handled by _ensure_table_exists_for_tenant
            is_initial_migration = hints.get('is_initial', False)
            logger.debug(f"Migration for tenant app {app_label} with tenant ID {current_tenant_id}: {is_initial_migration}")
            return is_initial_migration
        
        # Allow migrations for shared apps 
        if app_label in shared_apps:
            logger.debug(f"Allowing migration for shared app {app_label}")
            return True
        
        # Default behavior for other apps
        logger.debug(f"Default migration behavior for app {app_label}: {app_label not in tenant_apps}")
        return app_label not in tenant_apps
        
    @classmethod
    def clear_connection_cache(cls):
        """Clear the connection cache to force new connections"""
        global connection_cache
        logger.debug(f"Clearing connection cache with {len(connection_cache)} entries")
        connection_cache = {}
        
    @classmethod
    def get_connection_for_tenant(cls, tenant_id=None):
        """Get a connection for a specific tenant (utility method)"""
        router = cls()
        return router._get_optimized_connection_for_tenant(tenant_id)

# Import tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context