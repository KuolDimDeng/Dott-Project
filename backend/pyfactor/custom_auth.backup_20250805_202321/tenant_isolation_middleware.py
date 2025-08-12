"""
Tenant Isolation Middleware
Ensures proper RLS (Row-Level Security) tenant isolation for all database queries
"""

import logging
from django.db import connection
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)

class TenantIsolationMiddleware(MiddlewareMixin):
    """
    Middleware to enforce tenant isolation using PostgreSQL RLS
    Sets the current tenant context for each request
    """
    
    def process_request(self, request):
        """
        Set tenant context at the beginning of each request
        """
        # Skip if user is not set yet (happens before auth middleware runs)
        if not hasattr(request, 'user') or request.user is None:
            logger.debug("[TenantIsolation] Skipping - user not set yet")
            return
            
        # Skip for anonymous users
        if isinstance(request.user, AnonymousUser) or not request.user.is_authenticated:
            logger.debug("[TenantIsolation] Skipping - user not authenticated")
            return
        
        # Get tenant ID from user
        tenant_id = None
        
        # Try different ways to get tenant ID
        if hasattr(request.user, 'tenant') and request.user.tenant:
            tenant_id = str(request.user.tenant.id)
        elif hasattr(request.user, 'tenant_id'):
            tenant_id = str(request.user.tenant_id)
        
        if not tenant_id:
            # Try to get from TenantUser model
            try:
                from custom_auth.models import TenantUser
                tenant_user = TenantUser.objects.get(user=request.user)
                tenant_id = str(tenant_user.tenant_id)
            except:
                pass
        
        if tenant_id:
            # Set tenant context in PostgreSQL
            self._set_tenant_context(tenant_id, request.user.email)
        else:
            logger.warning(f"[TenantIsolation] No tenant ID found for user: {request.user.email}")
    
    def process_response(self, request, response):
        """
        Clear tenant context at the end of each request
        """
        self._clear_tenant_context()
        return response
    
    def _set_tenant_context(self, tenant_id, user_email):
        """
        Set PostgreSQL session variables for RLS
        """
        try:
            with connection.cursor() as cursor:
                # Set the current tenant ID for RLS policies
                cursor.execute(
                    "SET SESSION app.current_tenant_id = %s",
                    [tenant_id]
                )
                
                # Also set user email for audit purposes
                cursor.execute(
                    "SET SESSION app.current_user_email = %s",
                    [user_email]
                )
                
                logger.debug(f"[TenantIsolation] Set tenant context: {tenant_id} for {user_email}")
                
        except Exception as e:
            logger.error(f"[TenantIsolation] Failed to set tenant context: {str(e)}")
    
    def _clear_tenant_context(self):
        """
        Clear PostgreSQL session variables
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("RESET app.current_tenant_id")
                cursor.execute("RESET app.current_user_email")
                
                logger.debug("[TenantIsolation] Cleared tenant context")
                
        except Exception as e:
            logger.error(f"[TenantIsolation] Failed to clear tenant context: {str(e)}")


class TenantSecurityMiddleware(MiddlewareMixin):
    """
    Additional security middleware to prevent cross-tenant data access
    """
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        """
        Validate tenant access before processing views
        """
        # Skip if user is not set yet
        if not hasattr(request, 'user') or request.user is None:
            return None
            
        # Skip for anonymous users
        if isinstance(request.user, AnonymousUser) or not request.user.is_authenticated:
            return None
        
        # Check if tenant_id is in URL parameters
        tenant_id_from_url = view_kwargs.get('tenant_id')
        
        if tenant_id_from_url:
            # Verify user has access to this tenant
            user_tenant_id = None
            
            if hasattr(request.user, 'tenant') and request.user.tenant:
                user_tenant_id = str(request.user.tenant.id)
            
            if user_tenant_id and str(tenant_id_from_url) != user_tenant_id:
                logger.warning(
                    f"[TenantSecurity] Access denied - User {request.user.email} "
                    f"(tenant: {user_tenant_id}) tried to access tenant: {tenant_id_from_url}"
                )
                
                from django.http import JsonResponse
                return JsonResponse({
                    'error': 'Access denied',
                    'message': 'You do not have access to this tenant'
                }, status=403)
        
        return None