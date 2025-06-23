import logging
import time
import uuid
from django.db import connection
from django.urls import resolve

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
        
        # Get tenant information
        tenant = getattr(request.user, 'tenant', None)
        
        # Check if we need to create or complete schema setup
        schema_name = None
        setup_needed = False
        
        if tenant and  tenant.id:
            schema_name =  tenant.id
            
            # Check tenant setup status
            if hasattr(tenant, 'setup_status') and tenant.setup_status in ['minimal', 'pending', 'not_started']:
                setup_needed = True
                logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Schema {schema_name} has status {tenant.setup_status}, setup needed")
        
        # If we have a schema name but setup is needed
        if schema_name and setup_needed:
            logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Incomplete schema setup detected for user {request.user.id}")
            
            # Get pending setup from session or profile
            pending_setup = {}
            if hasattr(request, 'session'):
                pending_setup = request.session.get('pending_schema_setup', {})
            if not pending_setup:
                # Try to get from profile metadata
                try:
                    from users.models import UserProfile
                    profile = UserProfile.objects.filter(user=request.user).first()
                    if profile and hasattr(profile, 'metadata') and isinstance(profile.metadata, dict):
                        pending_setup = profile.metadata.get('pending_schema_setup', {})
                        logger.debug(f"[DASHBOARD-MIGRATION-{middleware_id}] Found pending setup in profile metadata")
                except Exception as e:
                    logger.warning(f"[DASHBOARD-MIGRATION-{middleware_id}] Failed to get pending setup from profile: {str(e)}")
            
            # If we have pending setup info, start the setup task
            if pending_setup:
                # Get business ID
                business_id = pending_setup.get('business_id')
                
                # Import the task here to avoid circular imports
                from onboarding.tasks import setup_user_schema_task
                
                # Trigger setup task
                logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Dashboard accessed with incomplete schema. Triggering setup for user {request.user.id}")
                task = setup_user_schema_task.delay(str(request.user.id), business_id)
                logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Setup task triggered with ID: {task.id}")
                
                # Add message about setup in progress
                if hasattr(request, '_messages'):
                    from django.contrib import messages
                    messages.info(request, "Your account is being set up. Some features may be unavailable for a few minutes.")
                    logger.debug(f"[DASHBOARD-MIGRATION-{middleware_id}] Added info message to request")
            else:
                # If we don't have pending setup info but the schema needs setup, check tables
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
                    
                    if table_count < 10:  # Assuming a minimal schema should have at least 10 tables
                        logger.warning(f"[DASHBOARD-MIGRATION-{middleware_id}] Dashboard accessed with incomplete schema {schema_name}. Triggering migrations.")
                        
                        # Check if deferred migrations marker exists
                        with connection.cursor() as cursor:
                            cursor.execute(f"""
                                SELECT EXISTS (
                                    SELECT 1 FROM information_schema.tables 
                                    WHERE table_schema = %s AND table_name = 'django_migrations'
                                )
                            """, [schema_name])
                            
                            if cursor.fetchone()[0]:
                                # Check for deferred migrations marker
                                cursor.execute(f"""
                                    SELECT COUNT(*) FROM {schema_name}.django_migrations
                                    WHERE app = 'onboarding' AND name = 'deferred_migrations'
                                """)
                                has_deferred_marker = cursor.fetchone()[0] > 0
                                
                                if has_deferred_marker:
                                    # Use setup_user_schema_task for schemas with deferred migrations
                                    from onboarding.tasks import setup_user_schema_task
                                    task = setup_user_schema_task.delay(str(request.user.id), None)
                                    logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Setup task triggered with ID: {task.id}")
                                else:
                                    # Fall back to migrate_tenant_schema for other cases
                                    from custom_auth.tasks import migrate_tenant_schema
                                    task = migrate_tenant_schema.delay(str(tenant.id))
                                    logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Migration task triggered with ID: {task.id}")
                            else:
                                # No migrations table, use full setup task
                                from onboarding.tasks import setup_user_schema_task
                                task = setup_user_schema_task.delay(str(request.user.id), None)
                                logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Setup task triggered with ID: {task.id}")
                        
                        # Add a message to the request to inform the user
                        if hasattr(request, '_messages'):
                            from django.contrib import messages
                            messages.info(request, "Your account is being set up. Some features may be unavailable for a few minutes.")
                            logger.debug(f"[DASHBOARD-MIGRATION-{middleware_id}] Added info message to request")
                    else:
                        logger.debug(f"[DASHBOARD-MIGRATION-{middleware_id}] Schema has sufficient tables, no migration needed")
                
                except Exception as e:
                    logger.error(f"[DASHBOARD-MIGRATION-{middleware_id}] Error checking schema tables: {str(e)}", exc_info=True)
        elif not tenant and hasattr(request.user, 'is_onboarded') and request.user.is_onboarded:
            # Special case: User is marked as onboarded but has no tenant
            logger.warning(f"[DASHBOARD-MIGRATION-{middleware_id}] User {request.user.id} is marked as onboarded but has no tenant")
            
            # Get pending setup from session
            pending_setup = {}
            if hasattr(request, 'session'):
                pending_setup = request.session.get('pending_schema_setup', {})
            if pending_setup and pending_setup.get('business_id'):
                # Trigger setup task
                from onboarding.tasks import setup_user_schema_task
                task = setup_user_schema_task.delay(str(request.user.id), pending_setup.get('business_id'))
                logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Setup task triggered for onboarded user without tenant: {task.id}")
            else:
                logger.error(f"[DASHBOARD-MIGRATION-{middleware_id}] Cannot trigger setup - no business_id in pending_setup")
        else:
            logger.debug(f"[DASHBOARD-MIGRATION-{middleware_id}] No setup needed or no tenant for user {request.user.id}")
        
        # Continue with the request
        response = self.get_response(request)
        
        # Log completion
        elapsed_time = time.time() - start_time
        logger.info(f"[DASHBOARD-MIGRATION-{middleware_id}] Dashboard middleware completed in {elapsed_time:.2f} seconds")
        
        return response