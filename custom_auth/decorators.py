"""
Decorators for tenant isolation and context management.
"""

import functools
import logging
from .tenant_context import set_current_tenant, clear_current_tenant, get_current_tenant

logger = logging.getLogger(__name__)

def tenant_context(view_func=None, *, require_tenant=True):
    """
    Decorator that sets up tenant context for a view.
    
    Args:
        view_func: The view function to decorate
        require_tenant: Whether to require a tenant context for the view (default: True)
        
    Example:
        @tenant_context
        def my_view(request):
            # This view will have tenant context set
            
        @tenant_context(require_tenant=False)
        def public_view(request):
            # This view can be accessed without a tenant
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapped_view(request, *args, **kwargs):
            # Default tenant_id to None
            tenant_id = None
            
            # Try to get tenant from request
            if hasattr(request, 'user') and request.user.is_authenticated:
                tenant_id = getattr(request.user, 'tenant_id', None)
                
            # Also check for tenant_id in request attributes (set by middleware)
            if not tenant_id and hasattr(request, 'tenant_id'):
                tenant_id = request.tenant_id
                
            # Check for tenant_id in kwargs
            if not tenant_id and 'tenant_id' in kwargs:
                tenant_id = kwargs.get('tenant_id')
                
            # Set tenant context if available
            if tenant_id:
                logger.debug(f"Setting tenant context to {tenant_id}")
                set_current_tenant(tenant_id)
            elif require_tenant:
                logger.warning("Tenant required but not found")
                # Return appropriate error response
                from django.http import HttpResponseForbidden
                return HttpResponseForbidden("Tenant context required for this view")
                
            try:
                # Call the view function
                return func(request, *args, **kwargs)
            finally:
                # Always clear tenant context
                clear_current_tenant()
                
        return wrapped_view
        
    if view_func:
        return decorator(view_func)
    return decorator

def admin_or_tenant_required(view_func):
    """
    Decorator that ensures the user is an admin or has a valid tenant context.
    """
    @functools.wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        # Allow admin users regardless of tenant
        if request.user.is_authenticated and request.user.is_staff:
            return view_func(request, *args, **kwargs)
            
        # Otherwise, require tenant context
        tenant_id = None
        
        # Try to get tenant from user
        if request.user.is_authenticated:
            tenant_id = getattr(request.user, 'tenant_id', None)
            
        # Check if we have a valid tenant
        if not tenant_id:
            logger.warning("No tenant context and user is not admin")
            from django.http import HttpResponseForbidden
            return HttpResponseForbidden("Admin or tenant context required for this view")
            
        # Set tenant context
        set_current_tenant(tenant_id)
        
        try:
            # Call the view function
            return view_func(request, *args, **kwargs)
        finally:
            # Always clear tenant context
            clear_current_tenant()
            
    return wrapped_view 