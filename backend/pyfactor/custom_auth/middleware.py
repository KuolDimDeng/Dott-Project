import logging
import uuid
import time
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.urls import resolve
from django.db import connection
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.response import Response
from rest_framework import status
from onboarding.utils import tenant_schema_context, create_tenant_schema
from custom_auth.models import Tenant
from django.db import IntegrityError
from custom_auth.utils import consolidate_user_tenants, acquire_user_lock, release_user_lock
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

def verify_auth_tables_in_schema(schema_name):
    """
    Verify that auth tables exist in the specified schema and create them if needed.
    This is critical for authentication to work properly when switching schemas.
    
    Args:
        schema_name: Name of the schema to check
        
    Returns:
        bool: True if tables exist or were created, False if failed
    """
    request_id = str(uuid.uuid4())[:8]
    logger.info(f"[SCHEMA-AUTH-{request_id}] Verifying auth tables in schema {schema_name}")
    
    try:
        with connection.cursor() as cursor:
            # Check if custom_auth_user table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = %s AND table_name = 'custom_auth_user'
                )
            """, [schema_name])
            
            table_exists = cursor.fetchone()[0]
            if table_exists:
                logger.debug(f"[SCHEMA-AUTH-{request_id}] Auth tables exist in schema {schema_name}")
                return True
            
            # Tables don't exist, create them
            logger.warning(f"[SCHEMA-AUTH-{request_id}] Auth tables missing in schema {schema_name}, creating them")
            
            # Temporarily store current search path
            cursor.execute('SHOW search_path')
            original_path = cursor.fetchone()[0]
            
            # Set search path to tenant schema
            cursor.execute(f'SET search_path TO "{schema_name}"')
            
            # Create auth tables in tenant schema
            cursor.execute(f"""
                -- Create auth tables
                CREATE TABLE IF NOT EXISTS custom_auth_user (
                    id UUID PRIMARY KEY,
                    password VARCHAR(128) NOT NULL,
                    last_login TIMESTAMP WITH TIME ZONE NULL,
                    is_superuser BOOLEAN NOT NULL,
                    email VARCHAR(254) NOT NULL UNIQUE,
                    first_name VARCHAR(100) NOT NULL DEFAULT '',
                    last_name VARCHAR(100) NOT NULL DEFAULT '',
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
                    date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
                    confirmation_token UUID NOT NULL DEFAULT gen_random_uuid(),
                    is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
                    stripe_customer_id VARCHAR(255) NULL,
                    role VARCHAR(20) NOT NULL DEFAULT 'OWNER',
                    occupation VARCHAR(50) NOT NULL DEFAULT 'OWNER',
                    tenant_id UUID NULL,
                    cognito_sub VARCHAR(36) NULL
                );
                
                CREATE INDEX IF NOT EXISTS custom_auth_user_email_key ON custom_auth_user (email);
                CREATE INDEX IF NOT EXISTS idx_user_tenant ON custom_auth_user (tenant_id);
                
                -- Auth User Permissions
                CREATE TABLE IF NOT EXISTS custom_auth_user_user_permissions (
                    id SERIAL PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES custom_auth_user(id),
                    permission_id INTEGER NOT NULL,
                    CONSTRAINT custom_auth_user_user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id)
                );
                
                -- Auth User Groups
                CREATE TABLE IF NOT EXISTS custom_auth_user_groups (
                    id SERIAL PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES custom_auth_user(id),
                    group_id INTEGER NOT NULL,
                    CONSTRAINT custom_auth_user_groups_user_id_group_id_key UNIQUE (user_id, group_id)
                );
                
                -- Tenant table
                CREATE TABLE IF NOT EXISTS custom_auth_tenant (
                    id UUID PRIMARY KEY,
                    schema_name VARCHAR(63) NOT NULL UNIQUE,
                    name VARCHAR(100) NOT NULL,
                    created_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    setup_status VARCHAR(20) NOT NULL,
                    setup_task_id VARCHAR(255) NULL,
                    last_setup_attempt TIMESTAMP WITH TIME ZONE NULL,
                    setup_error_message TEXT NULL,
                    last_health_check TIMESTAMP WITH TIME ZONE NULL,
                    storage_quota_bytes BIGINT NOT NULL DEFAULT 2147483648,
                    owner_id UUID NOT NULL
                );
            """)
            
            # Copy existing user and tenant data from public schema
            try:
                # Find tenant in public schema
                cursor.execute('SET search_path TO public')
                cursor.execute("""
                    SELECT id, owner_id FROM custom_auth_tenant WHERE schema_name = %s
                """, [schema_name])
                
                tenant_data = cursor.fetchone()
                if tenant_data:
                    tenant_id, owner_id = tenant_data
                    
                    # Get complete tenant data
                    cursor.execute("""
                        SELECT id, schema_name, name, created_on, is_active, setup_status, 
                               setup_task_id, last_setup_attempt, setup_error_message,
                               last_health_check, storage_quota_bytes, owner_id
                        FROM custom_auth_tenant
                        WHERE id = %s
                    """, [tenant_id])
                    
                    complete_tenant_data = cursor.fetchone()
                    
                    # Get owner data
                    cursor.execute("""
                        SELECT id, password, last_login, is_superuser, email, first_name, last_name, 
                               is_active, is_staff, date_joined, email_confirmed, confirmation_token, 
                               is_onboarded, stripe_customer_id, role, occupation, tenant_id, cognito_sub
                        FROM custom_auth_user
                        WHERE id = %s
                    """, [owner_id])
                    
                    owner_data = cursor.fetchone()
                    
                    # Insert owner into tenant schema first
                    if owner_data:
                        cursor.execute(f'SET search_path TO "{schema_name}"')
                        cursor.execute(f"""
                            INSERT INTO custom_auth_user 
                            (id, password, last_login, is_superuser, email, first_name, last_name, 
                             is_active, is_staff, date_joined, email_confirmed, confirmation_token, 
                             is_onboarded, stripe_customer_id, role, occupation, tenant_id, cognito_sub)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (id) DO NOTHING
                        """, owner_data)
                        
                        # Now insert tenant data
                        if complete_tenant_data:
                            cursor.execute(f"""
                                INSERT INTO custom_auth_tenant
                                (id, schema_name, name, created_on, is_active, setup_status, 
                                 setup_task_id, last_setup_attempt, setup_error_message,
                                 last_health_check, storage_quota_bytes, owner_id)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (id) DO NOTHING
                            """, complete_tenant_data)
            except Exception as copy_error:
                logger.error(f"[SCHEMA-AUTH-{request_id}] Error copying data to schema: {str(copy_error)}")
            
            # Restore original search path
            cursor.execute(f'SET search_path TO {original_path}')
            
            # Verify tables were created
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = %s AND table_name = 'custom_auth_user'
                )
            """, [schema_name])
            
            verify_table_exists = cursor.fetchone()[0]
            logger.info(f"[SCHEMA-AUTH-{request_id}] Auth table in {schema_name} exists: {verify_table_exists}")
            
            return verify_table_exists
            
    except Exception as e:
        logger.error(f"[SCHEMA-AUTH-{request_id}] Error verifying/creating auth tables in {schema_name}: {str(e)}")
        return False

class CustomCORSMiddleware:
    """
    Custom middleware to handle CORS headers for all responses.
    This ensures proper CORS headers are added regardless of response type.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Handle preflight requests
        if request.method == "OPTIONS":
            response = HttpResponse()
            self._add_cors_headers(response, request)
            return response

        response = self.get_response(request)
        self._add_cors_headers(response, request)
        return response

    def _add_cors_headers(self, response, request):
        origin = request.headers.get('Origin')
        if origin:
            response["Access-Control-Allow-Origin"] = origin
        else:
            response["Access-Control-Allow-Origin"] = "*"
            
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = (
            "accept, accept-encoding, authorization, content-type, dnt, "
            "origin, user-agent, x-csrftoken, x-requested-with, "
            "x-request-id, x-id-token, x-user-id"
        )
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Max-Age"] = "86400"  # 24 hours

class RequestIDMiddleware:
    """
    Middleware to track request IDs through the application.
    Adds a unique request ID to each request and includes it in the response headers.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            request_id = request.headers.get(settings.REQUEST_ID_HEADER)
            if not request_id and settings.GENERATE_REQUEST_ID_IF_ABSENT:
                request_id = str(uuid.uuid4())
            
            request.request_id = request_id
            response = self.get_response(request)
            
            if request_id:
                response['X-Request-ID'] = request_id
            
            return response
            
        except Exception as e:
            logger.error(
                f"Error in RequestIDMiddleware: {str(e)}", 
                exc_info=True,
                extra={'request_path': request.path}
            )
            return self.get_response(request)

class OnboardingMiddleware:
    """
    Middleware to handle onboarding flow using Cognito custom attributes from token claims.
    Ensures users can only access appropriate endpoints based on their onboarding status.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        # URLs that are always accessible
        self.public_paths = [
            '/api/auth/',
            '/api/session/',
            '/api/token/',
            '/health/',
            '/admin/',
            '/static/',
            '/media/',
            '/onboarding/setup/',
            '/onboarding/setup/status/',
            '/onboarding/setup/complete/',
            '/onboarding/reset/',
            '/api/token/refresh/',
            '/api/token/verify/',
            '/api/onboarding/setup/',
            '/api/onboarding/setup/status/',
            '/api/onboarding/setup/complete/',
            '/api/onboarding/reset/',
            '/api/profile/'
        ]
        
        # Add paths that should bypass authentication
        self.no_auth_paths = [
            '/api/onboarding/setup/',
            '/api/onboarding/setup/status/',
            '/api/onboarding/setup/complete/',
            '/api/onboarding/reset/',
            '/api/profile/'
        ]
        # Mapping of onboarding states to allowed URL patterns
        self.onboarding_routes = {
            'NOT_STARTED': [
                '/api/onboarding/business-info/',
                '/api/onboarding/reset/',
                '/api/onboarding/setup/'
            ],
            'BUSINESS_INFO': [
                '/api/onboarding/subscription/',
                '/api/onboarding/business-info/',
                '/api/onboarding/reset/',
                '/api/onboarding/setup/'
            ],
            'SUBSCRIPTION': [
                '/api/onboarding/payment/',
                '/api/onboarding/setup/',
                '/api/onboarding/subscription/',
                '/api/onboarding/reset/'
            ],
            'PAYMENT': [
                '/api/onboarding/setup/',
                '/api/onboarding/payment/',
                '/api/onboarding/reset/'
            ],
            'SETUP': [
                '/api/onboarding/complete/',
                '/api/onboarding/setup/',
                '/api/onboarding/setup/status/',
                '/api/onboarding/setup/complete/',
                '/api/onboarding/reset/'
            ],
            'COMPLETE': []  # All routes allowed
        }

    def process_request(self, request):
        """Handle CORS preflight requests and basic request validation"""
        if request.method == 'OPTIONS':
            response = Response()
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Id, x-id-token, x-user-id"
            response["Access-Control-Allow-Credentials"] = "true"
            return response

        # Check if path is in no_auth_paths
        if any(request.path.startswith(path) for path in self.no_auth_paths):
            return self.get_response(request)

        # Check if path is in public_paths
        if any(request.path.startswith(path) for path in self.public_paths):
            return self.get_response(request)

        return None

    def process_token_claims(self, request):
        """Process and validate token claims"""
        if not hasattr(request, 'auth') or not isinstance(request.auth, dict):
            return None, None, None

        claims = request.auth
        onboarding_status = claims.get('custom:onboarding', 'NOT_STARTED')
        current_step = claims.get('custom:currentStep', 'business-info')
        setup_done = claims.get('custom:setupdone', 'FALSE')

        return onboarding_status, current_step, setup_done

    def __call__(self, request):
        try:
            # Process initial request (handles OPTIONS and no_auth_paths)
            response = self.process_request(request)
            if response is not None:
                return response

            # For paths requiring authentication
            if not any(request.path.startswith(path) for path in self.no_auth_paths):
                # Process token claims
                onboarding_status, current_step, setup_done = self.process_token_claims(request)
                
                # Log request details
                logger.debug("Processing authenticated request", extra={
                    'path': request.path,
                    'onboarding_status': onboarding_status,
                    'current_step': current_step,
                    'setup_done': setup_done,
                    'headers': dict(request.headers),
                    'auth': getattr(request, 'auth', None)
                })
                
                # If no valid claims found and authentication is required
                if onboarding_status is None:
                    logger.error("Authentication required - No valid claims found", extra={
                        'path': request.path,
                        'headers': dict(request.headers),
                        'auth': getattr(request, 'auth', None)
                    })
                    response = Response(
                        {"error": "Authentication required"},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                    response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
                    response["Access-Control-Allow-Credentials"] = "true"
                    return response

                # Allow all routes if onboarding is complete
                if onboarding_status == 'COMPLETE' and setup_done == 'TRUE':
                    logger.debug("Onboarding complete, allowing all routes", extra={
                        'path': request.path,
                        'onboarding_status': onboarding_status
                    })
                    return self.get_response(request)

                # Check if current route is allowed for onboarding status
                allowed_routes = self.onboarding_routes.get(onboarding_status, [])
                if not any(request.path.startswith(route) for route in allowed_routes):
                    logger.warning(
                        "Access denied - Route not allowed for onboarding status",
                        extra={
                            'request_id': getattr(request, 'request_id', None),
                            'user_email': getattr(request.user, 'email', None),
                            'status': onboarding_status,
                            'path': request.path,
                            'allowed_routes': allowed_routes,
                            'method': request.method
                        }
                    )
                    return Response(
                        {
                            "error": "Onboarding required",
                            "currentStep": current_step,
                            "onboardingStatus": onboarding_status,
                            "allowedRoutes": allowed_routes,
                            "requestPath": request.path
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )

            # For no_auth_paths or when all checks pass
            return self.get_response(request)

        except Exception as e:
            logger.error(
                f"Error in OnboardingMiddleware: {str(e)}",
                exc_info=True,
                extra={
                    'request_id': getattr(request, 'request_id', None),
                    'path': request.path,
                    'user_id': getattr(request.user, 'id', None),
                    'method': request.method
                }
            )
            return self.get_response(request)

class TenantMiddleware:
    """
    Middleware for handling tenant context in requests.
    This middleware will:
    1. Extract tenant information from the request
    2. Set the current tenant for the duration of the request
    3. Clean up tenant context after the request is processed
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger('Pyfactor')

    def __call__(self, request):
        # Generate a request ID for tracking
        request_id = str(uuid.uuid4())[:8]
        request.request_id = request_id
        
        self.logger.debug(f"[TENANT-MW-{request_id}] Processing request: {request.path}")
        
        # Check if this is a dashboard request - if so, we need to trigger schema setup
        is_dashboard_request = '/dashboard' in request.path or '/api/dashboard' in request.path
        
        # Extract tenant information from the request
        tenant_id = None
        schema_name = None
        
        # Try to get tenant ID from headers first (highest priority)
        tenant_id_header = request.headers.get('X-Tenant-ID')
        schema_name_header = request.headers.get('X-Schema-Name')
        
        if tenant_id_header:
            tenant_id = tenant_id_header
            self.logger.debug(f"[TENANT-MW-{request_id}] Found tenant ID in header: {tenant_id}")
            
            # If schema name is also provided, use it
            if schema_name_header:
                schema_name = schema_name_header
                self.logger.debug(f"[TENANT-MW-{request_id}] Found schema name in header: {schema_name}")
        
        # If no tenant ID in headers, try to get from cookies
        if not tenant_id:
            tenant_id_cookie = request.COOKIES.get('tenantId')
            if tenant_id_cookie:
                tenant_id = tenant_id_cookie
                self.logger.debug(f"[TENANT-MW-{request_id}] Found tenant ID in cookie: {tenant_id}")
                
                # Generate schema name from tenant ID
                if tenant_id:
                    schema_name = f"tenant_{tenant_id.replace('-', '_')}"
                    self.logger.debug(f"[TENANT-MW-{request_id}] Generated schema name from cookie tenant ID: {schema_name}")
        
        # Check for business ID header as a fallback
        if not tenant_id:
            business_id_header = request.headers.get('X-Business-ID')
            if business_id_header:
                tenant_id = business_id_header
                self.logger.debug(f"[TENANT-MW-{request_id}] Using business ID as tenant ID: {tenant_id}")
                
                # Generate schema name from business ID
                if tenant_id:
                    schema_name = f"tenant_{tenant_id.replace('-', '_')}"
                    self.logger.debug(f"[TENANT-MW-{request_id}] Generated schema name from business ID: {schema_name}")
        
        # Store tenant information in the request for easy access
        request.tenant_id = tenant_id
        request.schema_name = schema_name
        
        # If we have a tenant ID, try to get the tenant from the database
        tenant = None
        if tenant_id and request.user.is_authenticated:
            try:
                # First try to find tenant by ID
                tenant = Tenant.objects.filter(id=tenant_id).first()
                
                if tenant:
                    self.logger.debug(f"[TENANT-MW-{request_id}] Found tenant by ID: {tenant.schema_name} (ID: {tenant.id})")
                    
                    # Verify ownership - if this tenant doesn't belong to the user, check for conflicts
                    if tenant.owner_id != request.user.id:
                        self.logger.warning(f"[TENANT-MW-{request_id}] Tenant {tenant.id} belongs to user {tenant.owner_id}, but current user is {request.user.id}")
                        
                        # Check if user has their own tenant
                        user_tenant = Tenant.objects.filter(owner=request.user).first()
                        if user_tenant and user_tenant.id != tenant.id:
                            self.logger.warning(f"[TENANT-MW-{request_id}] User {request.user.id} has a different tenant: {user_tenant.schema_name} (ID: {user_tenant.id})")
                            
                            # Log this conflict for investigation
                            self.logger.warning(f"[TENANT-MW-{request_id}] TENANT CONFLICT: Request specifies {tenant.schema_name} but user owns {user_tenant.schema_name}")
                
                # If not found by ID, try to find by schema name
                elif schema_name:
                    tenant = Tenant.objects.filter(schema_name=schema_name).first()
                    if tenant:
                        self.logger.debug(f"[TENANT-MW-{request_id}] Found tenant by schema name: {tenant.schema_name} (ID: {tenant.id})")
                
                # If still not found, try to find a tenant owned by this user
                if not tenant:
                    tenant = Tenant.objects.filter(owner=request.user).first()
                    if tenant:
                        self.logger.debug(f"[TENANT-MW-{request_id}] Using tenant owned by user: {tenant.schema_name} (ID: {tenant.id})")
                
                # As a last resort, try to consolidate tenants
                if not tenant:
                    try:
                        from custom_auth.utils import consolidate_user_tenants
                        tenant = consolidate_user_tenants(request.user)
                        if tenant:
                            self.logger.debug(f"[TENANT-MW-{request_id}] Using consolidated tenant: {tenant.schema_name} (ID: {tenant.id})")
                    except Exception as e:
                        self.logger.error(f"[TENANT-MW-{request_id}] Error consolidating tenants: {str(e)}")
                
                # Store the tenant in the request
                if tenant:
                    request.tenant = tenant
                    
                    # CRITICAL FIX: Set the tenant schema in thread local storage for database routing
                    from pyfactor.db_routers import TenantSchemaRouter, local
                    setattr(local, 'tenant_schema', tenant.schema_name)
                    self.logger.debug(f"[TENANT-MW-{request_id}] Set thread local tenant schema to: {tenant.schema_name}")
                    
                    # Explicitly set the search path for this connection if we have a tenant
                    try:
                        from django.db import connection
                        if not connection.in_atomic_block:  # Only if not already in a transaction
                            with connection.cursor() as cursor:
                                cursor.execute(f'SET search_path TO "{tenant.schema_name}",public')
                                self.logger.debug(f"[TENANT-MW-{request_id}] Set database search path to: {tenant.schema_name}")
                    except Exception as e:
                        self.logger.error(f"[TENANT-MW-{request_id}] Error setting search path: {str(e)}")
                        
            except Exception as e:
                self.logger.error(f"[TENANT-MW-{request_id}] Error finding tenant: {str(e)}")
        
        # Handle dashboard request schema setup if needed
        if is_dashboard_request and request.user.is_authenticated and (not tenant or tenant.database_status != 'active'):
            self.logger.debug(f"[TENANT-MW-{request_id}] Dashboard request detected, may need schema setup")
            # Continue with normal request processing (schema setup handled by views)
        
        # Process the request with tenant context established
        response = self.get_response(request)
        
        # Add tenant headers to the response for client tracking
        if tenant:
            response['X-Tenant-ID'] = str(tenant.id)
            response['X-Schema-Name'] = tenant.schema_name
            self.logger.debug(f"[TENANT-MW-{request_id}] Added tenant headers to response: ID={tenant.id}, Schema={tenant.schema_name}")
        
        return response