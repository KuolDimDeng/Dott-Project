"""
Middleware for handling tenant context in requests.
"""

import logging
from django.utils.deprecation import MiddlewareMixin
from .tenant_context import set_current_tenant, clear_current_tenant

logger = logging.getLogger(__name__)

class TenantMiddleware(MiddlewareMixin):
    """
    Middleware that sets tenant context for each request.
    Uses Row Level Security to enforce tenant isolation.
    """
    
    def process_request(self, request):
        """
        Sets the current tenant based on the authenticated user.
        """
        # Clear any existing tenant context
        clear_current_tenant()
        
        # Skip for anonymous users
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return
        
        # Get tenant from user
        tenant_id = getattr(request.user, 'tenant_id', None)
        
        if tenant_id:
            logger.debug(f"Setting tenant context to {tenant_id} for user {request.user.id}")
            set_current_tenant(tenant_id)
            
            # Also add to request for easy access in views
            request.tenant_id = tenant_id
        else:
            logger.debug(f"No tenant found for user {request.user.id}")
    
    def process_response(self, request, response):
        """
        Clears tenant context after request is processed.
        """
        clear_current_tenant()
        return response
    
    def process_exception(self, request, exception):
        """
        Clears tenant context when an exception occurs.
        """
        clear_current_tenant()
        return None 