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
        
        if tenant_id:
            # Set RLS tenant context based on async/sync context
            if is_async:
                asyncio.create_task(self._set_tenant_context_async(tenant_id))
            else:
                self._set_tenant_context_sync(tenant_id)
            
            # Store tenant ID in request for application use
            request.tenant_id = tenant_id
            logger.debug(f"Set tenant context to: {tenant_id}")
        else:
            # No tenant ID - either clear context or deny access
            # depending on your security needs
            if is_async:
                asyncio.create_task(self._set_tenant_context_async(None))
            else:
                self._set_tenant_context_sync(None)
            
            # Deny access to tenant-specific resources without a tenant ID
            if not request.path.startswith('/api/auth/'):
                logger.warning(f"Attempted access without tenant ID: {request.path}")
                # Optionally deny access here
                # return HttpResponseForbidden("Tenant ID required")
        
        # Process the request
        response = self.get_response(request)
        
        # Add tenant header to response if available
        if hasattr(request, 'tenant_id') and request.tenant_id:
            response['X-Tenant-ID'] = str(request.tenant_id)
            
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
                # Assuming user has a default_tenant_id field
                tenant_id = request.user.default_tenant_id
            except:
                pass
                
        return tenant_id
        
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