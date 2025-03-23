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
        # Check if this is a dashboard request - if so, we need to trigger schema setup
        is_dashboard_request = '/dashboard' in request.path or '/api/dashboard' in request.path
        
        if is_dashboard_request and hasattr(request, 'user') and request.user.is_authenticated:
            # First, ensure no duplicate tenants exist for this user
            if request.user.email:
                try:
                    # Use the consolidation function to check and fix any duplicate tenants
                    logger.info(f"[DASHBOARD] Checking for duplicate tenants for user {request.user.email}")
                    primary_tenant = consolidate_user_tenants(request.user)
                    
                    if primary_tenant:
                        logger.info(f"[DASHBOARD] User {request.user.email} has primary tenant: {primary_tenant.schema_name}")
                        
                        # Ensure user.tenant points to the primary tenant
                        if not request.user.tenant or request.user.tenant.id != primary_tenant.id:
                            request.user.tenant = primary_tenant
                            request.user.save(update_fields=['tenant'])
                            logger.info(f"[DASHBOARD] Updated user.tenant to match primary tenant for {request.user.email}")
                except Exception as e:
                    logger.error(f"[DASHBOARD] Error checking/consolidating tenants: {str(e)}")
            else:
                logger.warning(f"[DASHBOARD] User ID {request.user.id} has no email address, cannot check for duplicate tenants")
                
            # Check if we have pending schema setup
            pending_setup = request.session.get('pending_schema_setup', {})
            
            if pending_setup and pending_setup.get('deferred', False):
                logger.info(f"Dashboard access detected, triggering deferred schema setup for user {request.user.id}")
                
                # Double-check user doesn't already have a tenant before proceeding
                existing_tenant = None
                
                try:
                    from custom_auth.models import Tenant
                    
                    # First check if user.tenant is set
                    if hasattr(request.user, 'tenant') and request.user.tenant:
                        existing_tenant = request.user.tenant
                        logger.info(f"[DASHBOARD] User already has tenant {existing_tenant.schema_name} assigned")
                    
                    # Also check for any owned tenants
                    if not existing_tenant:
                        owned_tenant = Tenant.objects.filter(owner=request.user).first()
                        if owned_tenant:
                            logger.info(f"[DASHBOARD] Found owned tenant {owned_tenant.schema_name} for user {request.user.email}")
                            
                            # Update user.tenant reference
                            request.user.tenant = owned_tenant
                            request.user.save(update_fields=['tenant'])
                    
                    # If we found a tenant, update pending_setup to use this tenant
                    if existing_tenant:
                        pending_setup['tenant_id'] = str(existing_tenant.id)
                        pending_setup['schema_name'] = existing_tenant.schema_name
                        pending_setup['deferred'] = False  # No need to defer setup since tenant exists
                        pending_setup['found_existing'] = True
                        request.session['pending_schema_setup'] = pending_setup
                        request.session.modified = True
                        
                        logger.info(f"[DASHBOARD] Updated pending_setup to use existing tenant {existing_tenant.schema_name}")
                        
                        # Skip the task creation below since we found an existing tenant
                        return self.get_response(request)
                except Exception as e:
                    logger.error(f"[DASHBOARD] Error checking for existing tenant: {str(e)}")
                
                # Get business ID from pending setup
                business_id = pending_setup.get('business_id')
                
                if business_id:
                    # Trigger schema setup task
                    try:
                        from onboarding.tasks import setup_user_schema_task
                        
                        # Queue the task
                        task = setup_user_schema_task.apply_async(
                            args=[str(request.user.id), business_id],
                            queue='setup',
                            retry=True,
                            retry_policy={
                                'max_retries': 3,
                                'interval_start': 5,
                                'interval_step': 30,
                                'interval_max': 300
                            }
                        )
                        
                        logger.info(f"Queued deferred schema setup task {task.id} for user {request.user.id}")
                        
                        # Update session to indicate setup is in progress
                        pending_setup['deferred'] = False
                        pending_setup['in_progress'] = True
                        pending_setup['task_id'] = task.id
                        pending_setup['triggered_at'] = timezone.now().isoformat()
                        request.session['pending_schema_setup'] = pending_setup
                        request.session.modified = True
                        
                        # Also update user profile metadata
                        try:
                            from users.models import UserProfile
                            profile = UserProfile.objects.get(user=request.user)
                            if hasattr(profile, 'metadata') and isinstance(profile.metadata, dict):
                                profile.metadata['pending_schema_setup'] = pending_setup
                                profile.save(update_fields=['metadata'])
                        except Exception as e:
                            logger.warning(f"Failed to update profile metadata: {str(e)}")
                    except Exception as e:
                        logger.error(f"Failed to trigger schema setup task: {str(e)}")
        
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
                    # COMPREHENSIVE CHECK 1: First check if user already has a tenant (as owner)
                    from custom_auth.models import Tenant
                    from custom_auth.utils import acquire_user_lock, release_user_lock
                    
                    # Acquire lock to prevent concurrent tenant creation
                    lock_acquired = acquire_user_lock(request.user.id, timeout=10)
                    if lock_acquired:
                        try:
                            # Multiple comprehensive checks for existing tenants
                            existing_tenant = None
                            
                            # 1. Check if user already has a tenant assigned
                            if hasattr(request.user, 'tenant') and request.user.tenant:
                                existing_tenant = request.user.tenant
                                logger.debug(f"Found tenant {existing_tenant.schema_name} assigned to user {request.user.email}")
                            
                            # 2. If not found, check for owned tenants
                            if not existing_tenant:
                                owned_tenant = Tenant.objects.filter(owner=request.user).first()
                                if owned_tenant:
                                    existing_tenant = owned_tenant
                                    logger.debug(f"Found owned tenant {existing_tenant.schema_name} for user {request.user.email}")
                                    
                                    # Update user.tenant reference if it doesn't match
                                    if not request.user.tenant or request.user.tenant.id != owned_tenant.id:
                                        request.user.tenant = owned_tenant
                                        request.user.save(update_fields=['tenant'])
                                        logger.debug(f"Updated user.tenant to {owned_tenant.schema_name}")
                            
                            # 3. If not found, check for tenants where user is a member
                            if not existing_tenant:
                                member_tenant = Tenant.objects.filter(users=request.user).first()
                                if member_tenant:
                                    existing_tenant = member_tenant
                                    logger.debug(f"Found member tenant {existing_tenant.schema_name} for user {request.user.email}")
                                    
                                    # Update user.tenant reference if it doesn't match
                                    if not request.user.tenant or request.user.tenant.id != member_tenant.id:
                                        request.user.tenant = member_tenant
                                        request.user.save(update_fields=['tenant'])
                                        logger.debug(f"Updated user.tenant to {member_tenant.schema_name}")
                            
                            # 4. If not found, check if tenant exists with the provided schema name
                            if not existing_tenant:
                                schema_tenant = Tenant.objects.filter(schema_name=tenant_id).first()
                                if schema_tenant:
                                    existing_tenant = schema_tenant
                                    logger.debug(f"Found tenant with schema name {tenant_id}")
                                    
                                    # Link this tenant to the user if not already linked
                                    if schema_tenant.owner is None:
                                        schema_tenant.owner = request.user
                                        schema_tenant.save(update_fields=['owner'])
                                        logger.debug(f"Set user {request.user.email} as owner of tenant {schema_tenant.schema_name}")
                                    
                                    # Update user.tenant reference if it doesn't match
                                    if not request.user.tenant or request.user.tenant.id != schema_tenant.id:
                                        request.user.tenant = schema_tenant
                                        request.user.save(update_fields=['tenant'])
                                        logger.debug(f"Updated user.tenant to {schema_tenant.schema_name}")
                            
                            if existing_tenant:
                                tenant = existing_tenant
                                logger.debug(f"Using existing tenant: {tenant.schema_name}")
                            elif request.user.is_authenticated:
                                # COMPREHENSIVE CHECK 2: Double-check no tenant was created in parallel
                                # Check one more time in case a tenant was created by another process
                                last_check_tenant = Tenant.objects.filter(owner=request.user).first()
                                if last_check_tenant:
                                    tenant = last_check_tenant
                                    logger.warning(f"Found tenant {tenant.schema_name} created in parallel for user {request.user.email}")
                                    
                                    # Update user.tenant reference
                                    request.user.tenant = tenant
                                    request.user.save(update_fields=['tenant'])
                                else:
                                    # Create new tenant only if all checks pass and we're certain no tenant exists
                                    logger.debug(f"Creating new tenant with schema {tenant_id} for user {request.user.email}")
                                    try:
                                        from django.utils.text import slugify
                                        
                                        # Create a proper name for the tenant
                                        tenant_name = f"{getattr(request.user, 'full_name', request.user.email)}'s Workspace"
                                        
                                        tenant = Tenant.objects.create(
                                            schema_name=tenant_id,
                                            name=tenant_name,
                                            is_active=True,
                                            database_status='not_created',
                                            owner=request.user
                                        )
                                        
                                        # Immediately link tenant to user to prevent race conditions
                                        request.user.tenant = tenant
                                        request.user.save(update_fields=['tenant'])
                                        
                                        logger.debug(f"Successfully created tenant: {tenant.schema_name}")
                                    except IntegrityError:
                                        logger.warning("Duplicate tenant creation attempt detected")
                                        # Get existing tenant if race condition occurred
                                        tenant = Tenant.objects.filter(owner=request.user).first() or Tenant.objects.filter(schema_name=tenant_id).first()
                                        
                                        if not tenant:
                                            logger.error("Failed to create tenant and no existing tenant found")
                                            release_user_lock(request.user.id)
                                            return self.get_response(request)
                            elif not tenant:
                                logger.error("Cannot create tenant - no authenticated user")
                                release_user_lock(request.user.id)
                                return self.get_response(request)
                        finally:
                            # Always release the lock
                            release_user_lock(request.user.id)
                    else:
                        # If we couldn't acquire the lock, try to find existing tenant
                        logger.warning(f"Could not acquire lock for tenant creation for user {request.user.id}")
                        
                        # Try to find any existing tenant for this user
                        existing_tenant = Tenant.objects.filter(owner=request.user).first()
                        if existing_tenant:
                            tenant = existing_tenant
                            logger.debug(f"Using existing tenant without lock: {tenant.schema_name}")
                        else:
                            logger.error("Could not acquire lock and no existing tenant found")
                            return self.get_response(request)
                except Exception as e:
                    logger.error(f"Error handling tenant: {str(e)}")
                    return self.get_response(request)
                
                request.tenant = tenant
                logger.debug(f'Using tenant: {tenant.schema_name} (Status: {tenant.database_status})')
                
                # Check if schema creation should be deferred
                should_defer = False
                
                # Check session for pending schema setup with deferred flag
                pending_setup = request.session.get('pending_schema_setup', {})
                if pending_setup and pending_setup.get('deferred', False) is True:
                    should_defer = True
                    logger.debug(f"Found deferred schema setup in session for tenant: {tenant.schema_name}")
                
                # Also check user profile metadata for deferred flag
                if not should_defer and hasattr(request, 'user') and request.user.is_authenticated:
                    try:
                        from users.models import UserProfile
                        profile = UserProfile.objects.get(user=request.user)
                        if (hasattr(profile, 'metadata') and
                            isinstance(profile.metadata, dict) and
                            'pending_schema_setup' in profile.metadata and
                            profile.metadata['pending_schema_setup'].get('deferred', False) is True):
                            should_defer = True
                            logger.debug(f"Found deferred schema setup in profile metadata for tenant: {tenant.schema_name}")
                    except Exception as e:
                        # Check if the error is about the updated_at column
                        if "column users_userprofile.updated_at does not exist" in str(e):
                            logger.warning("UserProfile schema needs update - using modified_at instead of updated_at")
                            # Continue with execution - the schema will be updated later
                        else:
                            logger.warning(f"Error checking profile metadata for deferred flag: {str(e)}")
                        # Continue with execution even if there's an error checking metadata
                
                # Create schema if needed and not deferred
                if tenant.database_status == 'not_created' and not should_defer:
                    logger.debug(f"Creating schema for tenant: {tenant.schema_name} (not deferred)")
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
                elif tenant.database_status == 'not_created' and should_defer:
                    logger.info(f"Schema creation deferred for tenant: {tenant.schema_name}")

            try:
                # Always ensure we have a valid database connection
                connection.ensure_connection()
                
                # For onboarding endpoints, handle schema appropriately
                if request.path.startswith('/api/onboarding/'):
                    from pyfactor.db_routers import TenantSchemaRouter
                    
                    # For business-info endpoint, use the tenant's schema if available
                    if request.path.startswith('/api/onboarding/business-info') and tenant and tenant.schema_name:
                        # Use tenant schema for business-info endpoint
                        TenantSchemaRouter.get_connection_for_schema(tenant.schema_name)
                        logger.debug(f"Set schema to {tenant.schema_name} for business-info endpoint")
                    else:
                        # Use public schema for other onboarding endpoints
                        TenantSchemaRouter.get_connection_for_schema('public')
                        logger.debug("Set schema to public for onboarding endpoint")
                    
                    return self.get_response(request)
                
                # Fallback to user's tenant if header-based lookup failed
                if not tenant and hasattr(request, 'user') and request.user.is_authenticated:
                    # COMPREHENSIVE CHECK 3: Try all possible ways to find a tenant for this user
                    try:
                        from custom_auth.models import Tenant
                        
                        # Check if user.tenant is set
                        if hasattr(request.user, 'tenant') and request.user.tenant:
                            tenant = request.user.tenant
                            logger.debug(f"Found tenant in user.tenant: {tenant.schema_name}")
                        
                        # If not found, check for owned tenants
                        if not tenant:
                            owned_tenant = Tenant.objects.filter(owner=request.user).first()
                            if owned_tenant:
                                tenant = owned_tenant
                                logger.debug(f"Found owned tenant for user: {tenant.schema_name}")
                                
                                # Update user.tenant reference
                                request.user.tenant = tenant
                                request.user.save(update_fields=['tenant'])
                        
                        # If still not found, check for tenants where user is a member
                        if not tenant:
                            member_tenant = Tenant.objects.filter(users=request.user).first()
                            if member_tenant:
                                tenant = member_tenant
                                logger.debug(f"Found tenant where user is a member: {tenant.schema_name}")
                                
                                # Update user.tenant reference
                                request.user.tenant = tenant
                                request.user.save(update_fields=['tenant'])
                        
                        # Final resort - try to consolidate any duplicate tenants
                        if not tenant:
                            try:
                                from custom_auth.utils import consolidate_user_tenants
                                consolidated_tenant = consolidate_user_tenants(request.user)
                                if consolidated_tenant:
                                    tenant = consolidated_tenant
                                    logger.info(f"Found consolidated tenant for user: {tenant.schema_name}")
                            except Exception as e:
                                logger.error(f"Error consolidating tenants: {str(e)}")
                    except Exception as e:
                        logger.error(f"Error finding tenant for user: {str(e)}")
                
                    if tenant and tenant.is_active and tenant.schema_name:
                        # Store tenant in request for views
                        request.tenant = tenant
                        
                        # Check if schema creation should be deferred
                        should_defer = False
                        
                        # Check session for pending schema setup with deferred flag
                        pending_setup = request.session.get('pending_schema_setup', {})
                        if pending_setup and pending_setup.get('deferred', False) is True:
                            should_defer = True
                            logger.debug(f"Found deferred schema setup in session for tenant: {tenant.schema_name}")
                        
                        # Also check user profile metadata for deferred flag
                        if not should_defer:
                            try:
                                from users.models import UserProfile
                                profile = UserProfile.objects.get(user=request.user)
                                if (hasattr(profile, 'metadata') and
                                    isinstance(profile.metadata, dict) and
                                    'pending_schema_setup' in profile.metadata and
                                    profile.metadata['pending_schema_setup'].get('deferred', False) is True):
                                    should_defer = True
                                    logger.debug(f"Found deferred schema setup in profile metadata for tenant: {tenant.schema_name}")
                            except Exception as e:
                                logger.warning(f"Error checking profile metadata for deferred flag: {str(e)}")
                        
                        # Check if schema needs to be created and not deferred
                        if tenant.database_status == 'not_created' and not should_defer:
                            logger.info(f"Creating schema for tenant: {tenant.schema_name} (not deferred)")
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
                        elif tenant.database_status == 'not_created' and should_defer:
                            logger.info(f"Schema creation deferred for tenant: {tenant.schema_name}")
                        
                        # Use schema context for this request
                        try:
                            # Use optimized connection handling
                            from pyfactor.db_routers import TenantSchemaRouter
                            start_time = time.time()
                            
                            # Get optimized connection for tenant schema
                            TenantSchemaRouter.get_connection_for_schema(tenant.schema_name)
                            logger.debug(f"Set schema to {tenant.schema_name} in {time.time() - start_time:.4f}s")
                            
                            # Process the request with tenant schema
                            response = self.get_response(request)
                            
                            # Reset to public schema after request
                            TenantSchemaRouter.get_connection_for_schema('public')
                            logger.debug(f"Request with tenant schema completed in {time.time() - start_time:.4f}s")
                            
                            return response
                        except Exception as e:
                            logger.error(f"Error using schema context: {str(e)}")
                            # Fall back to default schema
                            from pyfactor.db_routers import TenantSchemaRouter
                            TenantSchemaRouter.get_connection_for_schema('public')
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