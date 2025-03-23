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

logger = logging.getLogger(__name__)

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
        
        # Try to get tenant ID from headers first
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
            except Exception as e:
                self.logger.error(f"[TENANT-MW-{request_id}] Error finding tenant: {str(e)}")
        
        # Handle dashboard request schema setup if needed
        if is_dashboard_request and request.user.is_authenticated and (not tenant or tenant.database_status != 'active'):
            self.logger.debug(f"[TENANT-MW-{request_id}] Dashboard request detected, may need schema setup")
            # Continue with normal request processing (schema setup handled by views)
        
        # Process the request
        response = self.get_response(request)
        
        # Add tenant headers to the response for client tracking
        if tenant:
            response['X-Tenant-ID'] = str(tenant.id)
            response['X-Schema-Name'] = tenant.schema_name
            self.logger.debug(f"[TENANT-MW-{request_id}] Added tenant headers to response: ID={tenant.id}, Schema={tenant.schema_name}")
        
        return response