import logging
import time
from django.db import connection
from django.http import JsonResponse
from onboarding.utils import create_tenant_schema
from custom_auth.models import Tenant

logger = logging.getLogger(__name__)

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
            '/api/onboarding/business-info/',
            '/api/onboarding/subscription/',
            '/api/onboarding/payment/',
            '/api/onboarding/setup/'
        ]

    def __call__(self, request):
        # Skip for public paths and onboarding paths
        if any(request.path.startswith(path) for path in self.public_paths) or \
           any(request.path.startswith(path) for path in self.no_tenant_paths):
            return self.get_response(request)

        # Start timing for performance monitoring
        start_time = time.time()
        request_id = getattr(request, 'request_id', 'unknown')
        
        try:
            # Log request details for debugging
            logger.debug(
                "Processing request in EnhancedTenantMiddleware",
                extra={
                    'request_id': request_id,
                    'path': request.path,
                    'method': request.method,
                    'user': getattr(request.user, 'username', None)
                }
            )

            # Extract tenant information from headers
            tenant_id = request.headers.get('X-Tenant-ID')
            schema_name = request.headers.get('X-Schema-Name')
            
            # Use schema name from header if provided, otherwise construct from tenant ID
            if schema_name:
                logger.debug(f"Using schema name from header: {schema_name}")
            elif tenant_id:
                # Convert tenant ID to schema name format
                schema_name = f"tenant_{tenant_id.replace('-', '_')}"
                logger.debug(f"Constructed schema name from tenant ID: {schema_name}")
            
            # If we have a schema name, try to use it
            if schema_name:
                # Check if schema exists in database
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT schema_name 
                        FROM information_schema.schemata 
                        WHERE schema_name = %s
                    """, [schema_name])
                    schema_exists = cursor.fetchone() is not None
                
                if not schema_exists:
                    logger.info(f"Schema {schema_name} does not exist, creating it")
                    try:
                        # Create schema if it doesn't exist
                        with connection.cursor() as cursor:
                            # Create schema
                            cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                            
                            # Set up permissions
                            db_user = connection.settings_dict['USER']
                            cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
                            cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
                            cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
                            
                            # Run migrations if needed
                            from django.core.management import call_command
                            call_command('migrate', schema=schema_name, verbosity=0)
                            
                            logger.info(f"Successfully created and configured schema: {schema_name}")
                    except Exception as e:
                        logger.error(f"Failed to create schema {schema_name}: {str(e)}")
                        return JsonResponse({
                            'error': 'Schema creation failed',
                            'details': str(e)
                        }, status=500)
                
                # Set search path for this request
                try:
                    with connection.cursor() as cursor:
                        cursor.execute(f'SET search_path TO "{schema_name}",public')
                    
                    # Store schema info in request for views to use
                    request.schema_name = schema_name
                    
                    # Process the request with tenant schema
                    response = self.get_response(request)
                    
                    # Reset to public schema after request
                    with connection.cursor() as cursor:
                        cursor.execute('SET search_path TO public')
                    
                    # Log performance metrics
                    elapsed_time = time.time() - start_time
                    logger.debug(
                        f"Request with schema {schema_name} completed",
                        extra={
                            'request_id': request_id,
                            'elapsed_time': f"{elapsed_time:.4f}s",
                            'schema': schema_name
                        }
                    )
                    
                    return response
                except Exception as e:
                    logger.error(f"Error using schema {schema_name}: {str(e)}")
                    # Fall back to public schema
                    with connection.cursor() as cursor:
                        cursor.execute('SET search_path TO public')
            
            # Fallback to user's tenant if header-based lookup failed
            if hasattr(request, 'user') and request.user.is_authenticated:
                tenant = getattr(request.user, 'tenant', None)
                
                if tenant and tenant.is_active and tenant.schema_name:
                    # Store tenant in request for views
                    request.tenant = tenant
                    request.schema_name = tenant.schema_name
                    
                    # Set search path for this request
                    with connection.cursor() as cursor:
                        cursor.execute(f'SET search_path TO "{tenant.schema_name}",public')
                    
                    # Process the request with tenant schema
                    response = self.get_response(request)
                    
                    # Reset to public schema after request
                    with connection.cursor() as cursor:
                        cursor.execute('SET search_path TO public')
                    
                    # Log performance metrics
                    elapsed_time = time.time() - start_time
                    logger.debug(
                        f"Request with user tenant schema completed",
                        extra={
                            'request_id': request_id,
                            'elapsed_time': f"{elapsed_time:.4f}s",
                            'schema': tenant.schema_name
                        }
                    )
                    
                    return response
            
            # Default to public schema if no tenant found
            with connection.cursor() as cursor:
                cursor.execute('SET search_path TO public')
            
            logger.debug("Using public schema (no tenant found)")
            return self.get_response(request)
            
        except Exception as e:
            logger.error(
                f"Error in EnhancedTenantMiddleware: {str(e)}",
                exc_info=True,
                extra={
                    'request_id': request_id,
                    'path': request.path,
                    'user_id': getattr(request.user, 'id', None)
                }
            )
            # Ensure we fall back to public schema
            with connection.cursor() as cursor:
                cursor.execute('SET search_path TO public')
            return self.get_response(request)