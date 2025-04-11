"""
Middleware for handling row-level security tenant context.
"""

import logging
import time
import jwt
import uuid
from django.utils.deprecation import MiddlewareMixin
from django.db import connection
from .rls import set_current_tenant_id, clear_current_tenant_id
from django.conf import settings
from django.http import JsonResponse
from .cognito import CognitoClient

logger = logging.getLogger(__name__)

class RowLevelSecurityMiddleware(MiddlewareMixin):
    """
    Middleware to automatically set tenant context for each request.
    This sets the PostgreSQL session variable for RLS based on the authenticated user's tenant.
    """
    
    def __init__(self, get_response=None):
        """Initialize the middleware with proper Django 3.x and ASGI support"""
        self.get_response = get_response
        self._rls_verified = False
        self.async_mode = False  # Add async_mode attribute for ASGI compatibility
        self.rls_verification_retries = 0
        self.max_verification_retries = 3
        # For ASGI compatibility, don't verify during startup
        # Will verify on first request instead
        
    def verify_rls(self):
        """Verify RLS setup if not already verified"""
        if not self._rls_verified and self.rls_verification_retries < self.max_verification_retries:
            try:
                from .rls import verify_rls_setup
                
                # Check if RLS is configured correctly
                rls_working = verify_rls_setup()
                
                if rls_working:
                    logger.info("Row Level Security (RLS) is properly configured.")
                    self._rls_verified = True
                else:
                    self.rls_verification_retries += 1
                    logger.error(f"Row Level Security (RLS) is NOT properly configured! (Attempt {self.rls_verification_retries}/{self.max_verification_retries})")
                    
                    # In development mode, continue anyway after max retries
                    if settings.DEBUG and self.rls_verification_retries >= self.max_verification_retries:
                        logger.warning("In DEBUG mode: Continuing despite RLS verification failure")
                        self._rls_verified = True
                    
            except Exception as e:
                self.rls_verification_retries += 1
                logger.error(f"Error verifying RLS: {str(e)} (Attempt {self.rls_verification_retries}/{self.max_verification_retries})")
                
                # In development mode, continue anyway after max retries
                if settings.DEBUG and self.rls_verification_retries >= self.max_verification_retries:
                    logger.warning("In DEBUG mode: Continuing despite RLS verification error")
                    self._rls_verified = True
    
    def process_request(self, request):
        """Set tenant context for the request."""
        # Do a one-time verification of RLS setup
        if not self._rls_verified:
            self.verify_rls()
            
        user = getattr(request, 'user', None)
        
        # Clear any previous tenant context
        clear_current_tenant_id()
        
        # Set tenant context if user is authenticated and has a tenant
        if user and user.is_authenticated and user.tenant_id:
            tenant_id = user.tenant_id
            set_current_tenant_id(tenant_id)
            logger.debug(f"RLS: Set tenant context to {tenant_id} for user {user.email}")
            
        return None
        
    def process_response(self, request, response):
        """Clear tenant context after the request."""
        clear_current_tenant_id()
        return response
        
    def process_exception(self, request, exception):
        """Clear tenant context on exception."""
        clear_current_tenant_id()
        return None

def verify_auth_tables_in_schema(tenant_id: uuid.UUID):
    """
    Verify that the auth tables exist in the specified schema.
    This is no longer needed with RLS, but kept for backward compatibility.
    
    Args:
        schema_name: The schema name to verify
        
    Returns:
        True if auth tables exist, False otherwise
    """
    logger.warning("verify_auth_tables_in_schema is deprecated with RLS architecture")
    return True


def get_schema_name_from_tenant_id(tenant_id):
    """
    Generate a schema name from a tenant ID for backward compatibility.
    
    Args:
        tenant_id: The tenant UUID
        
    Returns:
        A schema name in the format 'tenant_uuid' with hyphens replaced by underscores
    """
    if not tenant_id:
        return None
    
    # Convert tenant_id to string and replace hyphens with underscores
    tenant_id_str = str(tenant_id).replace('-', '_')
    return f"tenant_{tenant_id_str}"


class SchemaNameMiddleware:
    """
    Middleware to handle the removal of schema_name column by providing
    a consistent way to get the schema name from a tenant ID.
    
    This adds a method to the Tenant model instance dynamically to provide
    backward compatibility with code that expects  tenant.id.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Add schema_name property to Tenant model
        from custom_auth.models import Tenant
        
        # Only add if it doesn't already exist
        if not hasattr(Tenant, 'schema_name'):
            # Use setattr to add the property
            setattr(Tenant, 'schema_name', property(
                lambda self: get_schema_name_from_tenant_id(self.id))
            )
            logger.info("Added schema_name property to Tenant model")
            
        # Call the next middleware
        response = self.get_response(request)
        return response

class TenantMiddleware(MiddlewareMixin):
    """
    Middleware for handling tenant context in requests.
    This middleware sets the tenant context for RLS and provides
    backward compatibility with the previous schema-based approach.
    
    This middleware:
    1. Sets the tenant ID from the authenticated user
    2. Sets the RLS context in the database
    3. Provides compatibility with code that expects tenant schemas
    """
    
    def process_request(self, request):
        """Process incoming request to set tenant context."""
        user = getattr(request, 'user', None)
        
        # Clear any previous tenant context
        clear_current_tenant_id()
        
        # Set tenant context if user is authenticated and has a tenant
        if user and user.is_authenticated and user.tenant_id:
            tenant_id = user.tenant_id
            set_current_tenant_id(tenant_id)
            logger.debug(f"TenantMiddleware: Set tenant context to {tenant_id} for user {user.email}")
            
            # Store tenant ID in request for future middleware/views
            request.tenant_id = tenant_id
            request.id = get_schema_name_from_tenant_id(tenant_id)
            
        return None
        
    def process_response(self, request, response):
        """Clear tenant context after the request."""
        clear_current_tenant_id()
        return response
        
    def process_exception(self, request, exception):
        """Clear tenant context on exception."""
        clear_current_tenant_id()
        return None

class RequestIDMiddleware(MiddlewareMixin):
    """
    Middleware for adding request ID to each request.
    This helps with tracing requests through the system.
    """
    
    def process_request(self, request):
        """Add a request ID to the request."""
        import uuid
        from django.conf import settings
        
        # Get request ID header name from settings
        header_name = getattr(settings, 'REQUEST_ID_HEADER', 'HTTP_X_REQUEST_ID')
        
        # Check if the header exists
        request_id = request.META.get(header_name)
        
        # If not, generate a new one if the setting allows it
        if not request_id and getattr(settings, 'GENERATE_REQUEST_ID_IF_ABSENT', True):
            request_id = str(uuid.uuid4())
        
        # Store it in the request
        if request_id:
            request.request_id = request_id
            logger.debug(f"Added request ID: {request_id}")
        
        return None

class TokenRefreshMiddleware(MiddlewareMixin):
    """
    Middleware that checks for expiring JWT tokens and refreshes them automatically.
    This prevents token expiration errors from interrupting the user experience.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.cognito_client = CognitoClient()
        # Time buffer in seconds (refresh token if it expires within this window)
        self.refresh_buffer = 60 * 5  # 5 minutes
        self.async_mode = False  # Add async_mode attribute for ASGI compatibility
    
    def process_request(self, request):
        """
        Check if the access token is about to expire and refresh it if needed.
        """
        # Skip for paths that don't need token refresh
        skip_paths = [
            '/api/auth/signin', 
            '/api/auth/signup', 
            '/api/auth/refresh',
            '/api/auth/callback',
            '/api/auth/set-cookies',
            '/api/health-check',
            '/api/auth/error',
            '/api/auth/_log',
            '/static/',
            '/media/'
        ]
        
        path = request.path
        if any(path.startswith(skip_path) for skip_path in skip_paths):
            return None
            
        # Get tokens from cookies
        access_token = request.COOKIES.get('idToken')
        refresh_token = request.COOKIES.get('refresh_token')
        
        # If no tokens, continue with regular request flow
        if not access_token or not refresh_token:
            return None
            
        # Check if access token is about to expire
        try:
            # Decode token without verification to check expiration
            # We don't need to verify since we're just checking expiration
            decoded = jwt.decode(
                access_token, 
                options={
                    'verify_signature': False,
                    'verify_exp': False
                }
            )
            
            # Check if token is about to expire
            exp = decoded.get('exp', 0)
            current_time = time.time()
            
            # If token exists and is about to expire, refresh it
            if exp and (exp - current_time <= self.refresh_buffer):
                logger.info(f"Token about to expire in {exp - current_time} seconds, refreshing")
                
                try:
                    # Try to refresh the token
                    response = self.cognito_client.refresh_auth(refresh_token)
                    
                    if response and 'AuthenticationResult' in response:
                        auth_result = response['AuthenticationResult']
                        new_access_token = auth_result.get('IdToken')
                        
                        if new_access_token:
                            # Store new token for the current request
                            request.META['HTTP_AUTHORIZATION'] = f"Bearer {new_access_token}"
                            
                            # Store refreshed token in a request attribute 
                            # so it can be added to the response cookies
                            request.refreshed_tokens = {
                                'idToken': new_access_token,
                                'accessToken': auth_result.get('AccessToken')
                            }
                            
                            logger.info("Token refreshed successfully")
                except Exception as e:
                    # Log but continue with the current token - let the view handle any auth errors
                    logger.error(f"Failed to refresh token: {str(e)}")
        
        except Exception as e:
            # Log but don't interrupt the request
            logger.error(f"Error checking token expiration: {str(e)}")
        
        return None
    
    def process_response(self, request, response):
        """
        If the token was refreshed during the request, update the response cookies.
        """
        if hasattr(request, 'refreshed_tokens'):
            # Update cookies with new tokens
            from .views.token_service import TokenService
            
            # New tokens from request
            new_id_token = request.refreshed_tokens.get('idToken')
            new_access_token = request.refreshed_tokens.get('accessToken')
            
            # Set cookies with new tokens
            if new_id_token:
                TokenService.set_token_cookie(response, 'idToken', new_id_token)
            
            if new_access_token:
                TokenService.set_token_cookie(response, 'accessToken', new_access_token)
            
            # Add a header to indicate token was refreshed
            response['X-Token-Refreshed'] = 'true'
        
        return response