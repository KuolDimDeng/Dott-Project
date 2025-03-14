import logging
import time
import uuid
from django.db import connection
from django.urls import resolve
from custom_auth.tasks import migrate_tenant_schema

logger = logging.getLogger(__name__)

class DashboardMigrationMiddleware:
    """
    Middleware that checks if a tenant schema has tables when a user accesses the dashboard,
    and triggers migrations if needed.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        # Dashboard paths that should trigger schema check
        self.dashboard_paths = [
            '/dashboard',
            '/app/dashboard',
        ]
        # API paths that indicate dashboard usage
        self.dashboard_api_paths = [
            '/api/dashboard',
            '/api/sales',
            '/api/inventory',
            '/api/finance',
            '/api/purchases',
        ]

    def __call__(self, request):
        # Skip for non-dashboard paths
        if not any(request.path.startswith(path) for path in self.dashboard_paths) and \
           not any(request.path.startswith(path) for path in self.dashboard_api_paths):
            return self.get_response(request)
        
        # Generate a unique ID for this middleware call
        middleware_id = uuid.uuid4()
        start_time = time.time()
        logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Dashboard path accessed: {request.path}")
        
        # Skip if user is not authenticated
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            logger.debug(f"[DASHBOARD-MIGRATION-{middleware_id}] Skipping - user not authenticated")
            return self.get_response(request)
        
        # Skip if user doesn't have a tenant
        tenant = getattr(request.user, 'tenant', None)
        if not tenant:
            logger.debug(f"[DASHBOARD-MIGRATION-{middleware_id}] Skipping - user {request.user.id} has no tenant")
            return self.get_response(request)
        
        schema_name = tenant.schema_name
        logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Checking schema {schema_name} for user {request.user.id} (email: {request.user.email})")
        
        # Check if schema has tables
        try:
            with connection.cursor() as cursor:
                logger.debug(f"[DASHBOARD-MIGRATION-{middleware_id}] Executing query to count tables in schema {schema_name}")
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_schema = %s
                """, [schema_name])
                table_count = cursor.fetchone()[0]
            
            logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Schema {schema_name} has {table_count} tables")
            
            if table_count == 0:
                logger.warning(f"[DASHBOARD-MIGRATION-{middleware_id}] Dashboard accessed with empty schema {schema_name}. Triggering migrations.")
                
                # Trigger async migration
                task = migrate_tenant_schema.delay(str(tenant.id))
                logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Migration task triggered with ID: {task.id}")
                
                # Add a message to the request to inform the user
                if hasattr(request, '_messages'):
                    from django.contrib import messages
                    messages.info(request, "Your account is being set up. Some features may be unavailable for a few minutes.")
                    logger.debug(f"[DASHBOARD-MIGRATION-{middleware_id}] Added info message to request")
            else:
                logger.debug(f"[DASHBOARD-MIGRATION-{middleware_id}] Schema has tables, no migration needed")
        
        except Exception as e:
            logger.error(f"[DASHBOARD-MIGRATION-{middleware_id}] Error checking schema tables in dashboard middleware: {str(e)}", exc_info=True)
        
        # Continue with the request
        response = self.get_response(request)
        
        # Log completion
        elapsed_time = time.time() - start_time
        logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Dashboard middleware completed in {elapsed_time:.2f} seconds")
        
        return response