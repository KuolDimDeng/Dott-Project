import logging
import uuid
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.urls import resolve
from django.db import connection
from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework import status
from onboarding.utils import tenant_schema_context, create_tenant_schema
from custom_auth.models import Tenant

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
    Middleware to handle tenant schema switching based on the authenticated user.
    Uses schema-based multi-tenancy approach.
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

    def __call__(self, request):
        # Skip for public paths and onboarding paths
        # Allow initialization and business info endpoints without tenant context
        # Paths that don't require tenant context
        no_tenant_paths = [
            '/api/onboarding/setup/init/',
            '/api/onboarding/business-info/',
            '/api/onboarding/subscription/',
            '/api/onboarding/payment/',
            '/api/onboarding/setup/'  # Added this path
        ]
        if any(request.path.startswith(path) for path in self.public_paths) or any(request.path.startswith(path) for path in no_tenant_paths):
            return self.get_response(request)

        try:
            # Log request details for debugging
            logger.debug(
                "Processing request in TenantMiddleware",
                extra={
                    'path': request.path,
                    'method': request.method,
                    'headers': dict(request.headers),
                    'user': getattr(request.user, 'username', None)
                }
            )

            tenant = None  # Initialize tenant variable

            # Try to get tenant from X-Tenant-ID header first
            # First ensure authentication is handled
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                logger.debug("User not authenticated, authenticating...")
                auth_header = request.headers.get('Authorization')
                if auth_header and auth_header.startswith('Bearer '):
                    from custom_auth.authentication import CognitoAuthentication
                    auth = CognitoAuthentication()
                    try:
                        auth_result = auth.authenticate(request)
                        if auth_result:
                            request.user = auth_result[0]
                            logger.debug(f"Successfully authenticated user: {request.user.id}")
                    except Exception as e:
                        logger.error(f"Authentication failed: {str(e)}")
                        return self.get_response(request)

            tenant_id = request.headers.get('X-Tenant-ID')
            if tenant_id:
                logger.debug(f"Processing tenant request - ID: {tenant_id}, User: {getattr(request.user, 'id', None)}")
                
                try:
                    # First check if user already has a tenant
                    existing_tenant = Tenant.objects.filter(owner=request.user).first()
                    if existing_tenant:
                        logger.debug(f"Using existing tenant for user: {existing_tenant.schema_name}")
                        tenant = existing_tenant
                    else:
                        # Try to get tenant by schema name
                        tenant = Tenant.objects.filter(schema_name=tenant_id).first()
                        
                        if not tenant and request.user.is_authenticated:
                            logger.debug(f"Creating new tenant for authenticated user: {request.user.id}")
                            try:
                                tenant = Tenant.objects.create(
                                    schema_name=tenant_id,
                                    is_active=True,
                                    database_status='not_created',
                                    owner=request.user
                                )
                                logger.debug(f"Successfully created tenant: {tenant.schema_name}")
                            except IntegrityError:
                                logger.warning("Duplicate tenant creation attempt detected")
                                # Get existing tenant if race condition occurred
                                tenant = Tenant.objects.get(owner=request.user)
                        elif not tenant:
                            logger.error("Cannot create tenant - no authenticated user")
                            return self.get_response(request)
                except Exception as e:
                    logger.error(f"Error handling tenant: {str(e)}")
                    return self.get_response(request)
                
                request.tenant = tenant
                logger.debug(f'Using tenant: {tenant.schema_name} (Status: {tenant.database_status})')
                
                # Create schema if needed
                if tenant.database_status == 'not_created':
                    logger.debug(f"Creating schema for tenant: {tenant.schema_name}")
                    try:
                        with connection.cursor() as cursor:
                            create_tenant_schema(cursor, tenant.schema_name, request.user.id)
                            tenant.database_status = 'active'
                            tenant.save()
                            logger.debug(f"Schema created successfully for tenant: {tenant.schema_name}")
                    except Exception as e:
                        logger.error(f"Failed to create schema: {str(e)}")
                        with connection.cursor() as cursor:
                            cursor.execute('SET search_path TO public')
                        return self.get_response(request)

            try:
                # Always ensure we have a valid database connection
                connection.ensure_connection()
                
                # For onboarding endpoints, always use public schema
                if request.path.startswith('/api/onboarding/'):
                    with connection.cursor() as cursor:
                        cursor.execute('SET search_path TO public')
                    return self.get_response(request)
                
                # Fallback to user's tenant if header-based lookup failed
                if not tenant and hasattr(request, 'user') and request.user.is_authenticated:
                    tenant = getattr(request.user, 'tenant', None)
                    logger.debug(f"User tenant: {tenant}")
                
                    if tenant and tenant.is_active and tenant.schema_name:
                        # Store tenant in request for views
                        request.tenant = tenant
                        
                        # Check if schema needs to be created
                        if tenant.database_status == 'not_created':
                            logger.info(f"Creating schema for tenant: {tenant.schema_name}")
                            try:
                                with connection.cursor() as cursor:
                                    create_tenant_schema(cursor, tenant.schema_name, request.user.id)
                                    tenant.database_status = 'active'
                                    tenant.save()
                            except Exception as e:
                                logger.error(f"Failed to create schema: {str(e)}")
                                with connection.cursor() as cursor:
                                    cursor.execute('SET search_path TO public')
                                return self.get_response(request)
                        
                        # Use schema context for this request
                        try:
                            with connection.cursor() as cursor:
                                with tenant_schema_context(cursor, tenant.schema_name):
                                    response = self.get_response(request)
                                    return response
                        except Exception as e:
                            logger.error(f"Error using schema context: {str(e)}")
                            # Fall back to default schema
                            with connection.cursor() as cursor:
                                cursor.execute('SET search_path TO public')
                            return self.get_response(request)
                    else:
                        logger.warning(
                            "No active tenant found for authenticated user",
                            extra={
                                'user_id': request.user.id,
                                'request_id': getattr(request, 'request_id', None)
                            }
                        )
                
                # Default to public schema
                with connection.cursor() as cursor:
                    cursor.execute('SET search_path TO public')
                return self.get_response(request)

            except Exception as e:
                logger.error(f"Error in TenantMiddleware: {str(e)}")
                # Ensure we fall back to public schema
                with connection.cursor() as cursor:
                    cursor.execute('SET search_path TO public')
                return self.get_response(request)

        except Exception as e:
            logger.error(
                f"Error in TenantMiddleware: {str(e)}",
                exc_info=True,
                extra={
                    'request_id': getattr(request, 'request_id', None),
                    'user_id': getattr(request.user, 'id', None),
                    'path': request.path
                }
            )
            return self.get_response(request)