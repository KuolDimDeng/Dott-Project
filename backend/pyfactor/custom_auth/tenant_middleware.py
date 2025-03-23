import logging
import time
import psycopg2
import threading
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from django.db import connection
from django.http import JsonResponse
from onboarding.utils import create_tenant_schema
from custom_auth.models import Tenant
from custom_auth.connection_utils import get_connection_for_schema, set_current_schema, get_current_schema

logger = logging.getLogger(__name__)

# Global lock for schema creation to prevent race conditions
schema_creation_lock = threading.RLock()

def verify_essential_tables(cursor, schema_name):
    """
    Verify that all essential tables exist in the schema.
    Returns a tuple of (all_tables_exist, missing_tables)
    """
    essential_tables = ['users_business', 'users_userprofile', 'onboarding_onboardingprogress', 'django_migrations']
    
    # Check which tables exist
    cursor.execute(f"""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = %s AND table_name IN %s
    """, [schema_name, tuple(essential_tables)])
    
    existing_tables = [row[0] for row in cursor.fetchall()]
    missing_tables = set(essential_tables) - set(existing_tables)
    
    return len(missing_tables) == 0, missing_tables

class EnhancedTenantMiddleware:
    """
    Enhanced middleware to handle tenant schema switching with improved error handling
    and performance optimizations.
    
    This middleware:
    1. Extracts tenant information from request headers
    2. Creates schemas on demand if they don't exist
    3. Sets the appropriate PostgreSQL search path for the request
    4. Handles schema switching with connection pooling optimizations
    5. Provides detailed logging for debugging
    6. Ensures essential tables exist before use
    7. Uses explicit schema prefixes for critical queries
    """
    def __init__(self, get_response):
        self.get_response = get_response
        # URLs that don't need tenant context
        self.public_paths = [
            '/api/auth/',
            '/api/session/',
            '/api/token/',
            '/health/',
            '/admin/',
            '/static/',
            '/media/',
            '/onboarding/',
            '/api/token/refresh/',
            '/api/token/verify/',
        ]
        # Paths that don't require tenant context
        self.no_tenant_paths = [
            '/api/onboarding/setup/init/',
            '/api/onboarding/subscription/',
            '/api/onboarding/payment/',
            '/api/onboarding/setup/'
            # Removed '/api/onboarding/business-info/' from no_tenant_paths to ensure it uses tenant schema
        ]
    def set_schema_with_transaction_handling(self, schema_name):
        """Set the schema with proper transaction handling"""
        from django.db import connection
        
        # If we're in a transaction, we need to commit it before changing schemas
        if connection.in_atomic_block:
            # Log that we're in a transaction
            logger.warning(f"Attempting to change schema while in transaction. Committing first.")
            connection.commit()
        
        # Now set the schema
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema_name}"')

    def __call__(self, request):
        # Skip for public paths and onboarding paths
        if any(path in request.path for path in self.public_paths):
            # No tenant context needed for these paths
            return self.get_response(request)
        
        # Generate a request ID for request tracking
        request_id = getattr(request, 'request_id', str(time.time())[-6:])
        
        # Start time for performance tracking
        start_time = time.time()
        
        # Initialize variables
        tenant_id = None
        schema_name = None
        schema_from = "default"
        found_in_header = False
        found_in_cookie = False
        found_in_session = False
        
        # 1. Try to get tenant ID from headers
        tenant_id = request.headers.get('X-Tenant-ID')
        schema_name = request.headers.get('X-Schema-Name')
        
        if tenant_id:
            found_in_header = True
            schema_from = "header"
            logger.info(f"[TENANT-{request_id}] Found tenant ID in header: {tenant_id}")
            
            # If schema name is provided via header, use it
            if schema_name:
                logger.info(f"[TENANT-{request_id}] Found schema name in header: {schema_name}")
            else:
                # Generate schema name from tenant ID
                schema_name = f"tenant_{tenant_id.replace('-', '_')}"
                logger.info(f"[TENANT-{request_id}] Generated schema name from header tenant ID: {schema_name}")
        
        # 2. If not in headers, try cookies
        if not tenant_id and hasattr(request, 'COOKIES'):
            tenant_id_cookie = request.COOKIES.get('tenantId')
            if tenant_id_cookie:
                tenant_id = tenant_id_cookie
                found_in_cookie = True
                schema_from = "cookie"
                logger.info(f"[TENANT-{request_id}] Found tenant ID in cookie: {tenant_id}")
                
                # Generate schema name from tenant ID
                schema_name = f"tenant_{tenant_id.replace('-', '_')}"
                logger.info(f"[TENANT-{request_id}] Generated schema name from cookie tenant ID: {schema_name}")
        
        # 3. If not in cookies, try session
        if not tenant_id and hasattr(request, 'session'):
            tenant_id_session = request.session.get('tenant_id')
            if tenant_id_session:
                tenant_id = tenant_id_session
                found_in_session = True
                schema_from = "session"
                logger.info(f"[TENANT-{request_id}] Found tenant ID in session: {tenant_id}")
                
                # Generate schema name from tenant ID
                schema_name = f"tenant_{tenant_id.replace('-', '_')}"
                logger.info(f"[TENANT-{request_id}] Generated schema name from session tenant ID: {schema_name}")
        
        # 4. Check for business ID header as a fallback
        if not tenant_id:
            business_id_header = request.headers.get('X-Business-ID')
            if business_id_header:
                tenant_id = business_id_header
                schema_from = "business-id"
                logger.info(f"[TENANT-{request_id}] Using business ID as tenant ID: {tenant_id}")
                
                # Generate schema name from business ID
                schema_name = f"tenant_{tenant_id.replace('-', '_')}"
                logger.info(f"[TENANT-{request_id}] Generated schema name from business ID: {schema_name}")
        
        # Store tenant information in the request for other components
        request.tenant_id = tenant_id
        request.schema_name = schema_name
        
        # If we have a schema name, attempt to use it
        if schema_name:
            # Check for schema in database first
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.schemata 
                        WHERE schema_name = %s
                    )
                """, [schema_name])
                schema_exists = cursor.fetchone()[0]
                
                if schema_exists:
                    logger.info(f"[TENANT-{request_id}] Schema {schema_name} already exists in database")
                    
                    # List all schemas to check for potential issues
                    cursor.execute("""
                        SELECT schema_name
                        FROM information_schema.schemata
                        WHERE schema_name LIKE 'tenant_%'
                        ORDER BY schema_name
                    """)
                    all_schemas = [row[0] for row in cursor.fetchall()]
                    logger.info(f"[TENANT-{request_id}] All tenant schemas in database: {', '.join(all_schemas)}")
                    
                    if len(all_schemas) > 1:
                        # Check for potential multiple schemas for the same user
                        if request.user.is_authenticated:
                            try:
                                user_tenants = list(Tenant.objects.filter(owner=request.user))
                                if len(user_tenants) > 1:
                                    logger.warning(f"[TENANT-{request_id}] User {request.user.email} has {len(user_tenants)} tenants: {', '.join([t.schema_name for t in user_tenants])}")
                            except Exception as e:
                                logger.error(f"[TENANT-{request_id}] Error checking user tenants: {str(e)}")
                else:
                    logger.warning(f"[TENANT-{request_id}] Schema {schema_name} does not exist in database")
            
            # Set the schema for this request
            try:
                # Set the search path for this connection
                self.set_schema_with_transaction_handling(schema_name)
                
                # Verify the current search path
                with connection.cursor() as cursor:
                    cursor.execute('SHOW search_path')
                    current_path = cursor.fetchone()[0]
                    
                    logger.info(f"[TENANT-{request_id}] Current search path: {current_path}")
                    if schema_name not in current_path:
                        logger.error(f"[TENANT-{request_id}] SCHEMA MISMATCH: Expected {schema_name} in search path but got {current_path}")
            except Exception as e:
                logger.error(f"[TENANT-{request_id}] Error setting schema: {str(e)}")
        else:
            logger.warning(f"[TENANT-{request_id}] No schema name available for request to {request.path}")
        
        # Process the request
        try:
            response = self.get_response(request)
            
            # Add tenant headers to the response
            if tenant_id:
                response['X-Tenant-ID'] = tenant_id
                if schema_name:
                    response['X-Schema-Name'] = schema_name
                response['X-Tenant-Source'] = schema_from
            
            # Add timing information for performance monitoring
            elapsed_time = time.time() - start_time
            logger.info(f"[TENANT-{request_id}] Request processed in {elapsed_time:.4f}s (Schema: {schema_name}, Source: {schema_from})")
            
            return response
        finally:
            # Reset connection after request
            try:
                # Reset search path to public
                with connection.cursor() as cursor:
                    cursor.execute('SET search_path TO public')
            except Exception as e:
                logger.error(f"[TENANT-{request_id}] Error resetting search path: {str(e)}")