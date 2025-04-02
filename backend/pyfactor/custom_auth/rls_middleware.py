import logging
import uuid
from django.db import connection
from django.http import HttpResponseForbidden
from asgiref.sync import sync_to_async
import asyncio

logger = logging.getLogger(__name__)

class RowLevelSecurityMiddleware:
    """
    Middleware to set PostgreSQL's Row Level Security (RLS) context
    based on the current tenant ID from request information.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # URLs that don't need tenant context
        self.public_paths = [
            '/api/auth/',
            '/api/session/',
            '/admin/',
            '/static/',
            '/media/',
            '/onboarding/',
            '/api/token/refresh/',
            '/api/token/verify/',
            '/health/',
        ]
        
    def __call__(self, request):
        # Determine if this is async request
        is_async = asyncio.iscoroutinefunction(self.get_response)
        
        # Skip for public paths
        if any(request.path.startswith(path) for path in self.public_paths):
            # Reset tenant context to default for public paths
            if is_async:
                asyncio.create_task(self._set_tenant_context_async(None))
            else:
                self._set_tenant_context_sync(None)
            return self.get_response(request)
            
        # Extract tenant ID from request
        tenant_id = self._get_tenant_id(request)
        
        # Set tenant context in database
        if tenant_id:
            logger.debug(f"Setting RLS tenant context: {tenant_id}")
            
            if is_async:
                asyncio.create_task(self._set_tenant_context_async(tenant_id))
            else:
                self._set_tenant_context_sync(tenant_id)
        else:
            # Handle case where no tenant ID is available
            if request.user and request.user.is_authenticated:
                logger.warning(f"Authenticated user with no tenant ID: {request.user.id}")
                
                # Skip specific paths even when authenticated
                skip_paths = ['/api/user/profile', '/api/tenant/']
                if any(request.path.startswith(path) for path in skip_paths):
                    if is_async:
                        asyncio.create_task(self._set_tenant_context_async(None))
                    else:
                        self._set_tenant_context_sync(None)
                    return self.get_response(request)
                
                # For authenticated users, we can extract tenant from their profile
                if hasattr(request.user, 'tenant_id') and request.user.tenant_id:
                    logger.debug(f"Using tenant from user profile: {request.user.tenant_id}")
                    if is_async:
                        asyncio.create_task(self._set_tenant_context_async(request.user.tenant_id))
                    else:
                        self._set_tenant_context_sync(request.user.tenant_id)
                else:
                    logger.debug("Authenticated user without tenant, clearing context")
                    if is_async:
                        asyncio.create_task(self._set_tenant_context_async(None))
                    else:
                        self._set_tenant_context_sync(None)
            else:
                # No tenant and not authenticated - use unset context
                logger.debug("No tenant ID and not authenticated, clearing context")
                if is_async:
                    asyncio.create_task(self._set_tenant_context_async(None))
                else:
                    self._set_tenant_context_sync(None)
        
        # Continue with request
        response = self.get_response(request)
        return response
        
    def _get_tenant_id(self, request):
        """Extract tenant ID from headers, cookies, or session"""
        # Try headers first
        tenant_id = request.headers.get('X-Tenant-ID')
        
        # Then try cookies
        if not tenant_id and hasattr(request, 'COOKIES'):
            tenant_id = request.COOKIES.get('tenantId')
            
        # Finally try session
        if not tenant_id and hasattr(request, 'session'):
            tenant_id = request.session.get('tenant_id')
            
        # Try to get tenant from authenticated user if available
        if not tenant_id and request.user and request.user.is_authenticated:
            try:
                # Get tenant ID from user model
                tenant_id = request.user.tenant_id
            except:
                pass
                
        # Validate and return UUID
        if tenant_id:
            try:
                return uuid.UUID(tenant_id)
            except (ValueError, TypeError):
                logger.warning(f"Invalid tenant ID format: {tenant_id}")
                return None
                
        return None
        
    def _set_tenant_context_sync(self, tenant_id):
        """Set the PostgreSQL RLS tenant context synchronously"""
        try:
            with connection.cursor() as cursor:
                if tenant_id:
                    # Set the tenant context
                    cursor.execute("SET app.current_tenant_id = %s", [str(tenant_id)])
                else:
                    # Clear tenant context for public access
                    cursor.execute("SET app.current_tenant_id = 'unset'")
        except Exception as e:
            logger.error(f"Error setting tenant context: {str(e)}")
                
    @sync_to_async
    def _set_tenant_context_async(self, tenant_id):
        """Set the PostgreSQL RLS tenant context asynchronously"""
        return self._set_tenant_context_sync(tenant_id) 