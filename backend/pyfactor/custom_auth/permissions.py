from rest_framework import permissions, status
from rest_framework.response import Response
from functools import wraps
from django.shortcuts import get_object_or_404
from .models import UserPageAccess, PagePermission
import logging

logger = logging.getLogger(__name__)


class TenantAccessPermission(permissions.BasePermission):
    """
    Ensures that users can only access data from their own tenant.
    """
    
    def has_permission(self, request, view):
        # User must be authenticated
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Check if the object has a tenant_id attribute
        if hasattr(obj, 'tenant_id'):
            return obj.tenant_id == request.user.tenant_id
        return True


class SetupEndpointPermission(permissions.BasePermission):
    """
    Custom permission class for setup endpoints.
    Allows unauthenticated access to setup-related endpoints while requiring
    authentication for all others.
    """
    
    def has_permission(self, request, view):
        # Define setup-related paths that don't require authentication
        setup_paths = [
            '/api/onboarding/setup/',
            '/api/onboarding/setup/status/',
            '/api/onboarding/setup/complete/',
            '/api/onboarding/setup/start/',
            '/api/onboarding/reset/',
            '/api/profile/'
        ]
        
        # Always allow OPTIONS requests for CORS
        if request.method == 'OPTIONS':
            return True
            
        # Check if the path is in setup paths
        path = request.path.rstrip('/')
        if any(path.startswith(setup_path) for setup_path in setup_paths):
            return True
            
        # For all other paths, require authentication
        return request.user and request.user.is_authenticated


class PageAccessPermission(permissions.BasePermission):
    """
    Permission class to check page-level access based on user permissions
    """
    
    def __init__(self, path=None, action='read'):
        self.path = path
        self.action = action
        super().__init__()
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        user = request.user
        
        # OWNER and ADMIN have full access
        if user.role in ['OWNER', 'ADMIN']:
            return True
        
        # Determine the path to check
        check_path = self.path
        if not check_path:
            # Try to infer from request path
            request_path = request.path
            if '/api/' in request_path:
                parts = request_path.split('/api/')[1].split('/')
                if parts[0] in ['sales', 'hr', 'finance', 'inventory']:
                    check_path = f'/dashboard/{parts[0]}'
                else:
                    # Default to allowing if we can't determine the path
                    logger.warning(f"Could not determine path from request: {request_path}")
                    return True
        
        # For USER role, check specific permissions
        if user.role == 'USER':
            permission = UserPageAccess.objects.filter(
                user=user,
                page__path=check_path,
                tenant=user.tenant
            ).select_related('page').first()
            
            if not permission:
                return False
            
            # Check specific action permission
            permission_map = {
                'read': permission.can_read,
                'write': permission.can_write,
                'edit': permission.can_edit,
                'delete': permission.can_delete
            }
            
            return permission_map.get(self.action, False)
        
        return False


def require_page_permission(path=None, action='read'):
    """
    Decorator to check if user has permission to access a specific page/route
    
    Args:
        path: The path to check permissions for (e.g., '/dashboard/products')
              If None, will try to infer from the request path
        action: The action to check ('read', 'write', 'edit', 'delete')
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return Response(
                    {"error": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            user = request.user
            
            # OWNER and ADMIN have full access
            if user.role in ['OWNER', 'ADMIN']:
                return view_func(request, *args, **kwargs)
            
            # Determine the path to check
            check_path = path
            if not check_path:
                # Try to infer from request path
                request_path = request.path
                if '/api/' in request_path:
                    parts = request_path.split('/api/')[1].split('/')
                    if parts[0] in ['sales', 'hr', 'finance', 'inventory']:
                        check_path = f'/dashboard/{parts[0]}'
                    else:
                        # Default to allowing if we can't determine the path
                        logger.warning(f"Could not determine path from request: {request_path}")
                        return view_func(request, *args, **kwargs)
            
            # For USER role, check specific permissions
            if user.role == 'USER':
                permission = UserPageAccess.objects.filter(
                    user=user,
                    page__path=check_path,
                    tenant=user.tenant
                ).select_related('page').first()
                
                if not permission:
                    logger.warning(f"User {user.email} has no permission for path {check_path}")
                    return Response(
                        {
                            "error": "Access denied",
                            "detail": f"You don't have permission to access this resource"
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                # Check specific action permission
                permission_map = {
                    'read': permission.can_read,
                    'write': permission.can_write,
                    'edit': permission.can_edit,
                    'delete': permission.can_delete
                }
                
                if not permission_map.get(action, False):
                    logger.warning(f"User {user.email} lacks {action} permission for {check_path}")
                    return Response(
                        {
                            "error": "Insufficient permissions",
                            "detail": f"You don't have {action} permission for this resource"
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Permission granted, proceed with the view
            return view_func(request, *args, **kwargs)
        
        return wrapped_view
    return decorator


def check_page_permission(user, path, action='read'):
    """
    Utility function to check if a user has permission for a path
    
    Args:
        user: The user object
        path: The path to check
        action: The action to check ('read', 'write', 'edit', 'delete')
    
    Returns:
        bool: True if user has permission, False otherwise
    """
    # OWNER and ADMIN have full access
    if user.role in ['OWNER', 'ADMIN']:
        return True
    
    # For USER role, check specific permissions
    if user.role == 'USER':
        permission = UserPageAccess.objects.filter(
            user=user,
            page__path=path,
            tenant=user.tenant
        ).first()
        
        if not permission:
            return False
        
        permission_map = {
            'read': permission.can_read,
            'write': permission.can_write,
            'edit': permission.can_edit,
            'delete': permission.can_delete
        }
        
        return permission_map.get(action, False)
    
    return False


def get_user_permissions(user):
    """
    Get all page permissions for a user
    
    Args:
        user: The user object
    
    Returns:
        list: List of permission dictionaries
    """
    permissions = []
    
    if user.role == 'OWNER':
        # Owners have full access to all pages
        all_pages = PagePermission.objects.filter(is_active=True)
        for page in all_pages:
            permissions.append({
                'path': page.path,
                'name': page.name,
                'category': page.category,
                'can_read': True,
                'can_write': True,
                'can_edit': True,
                'can_delete': True
            })
    elif user.role == 'ADMIN':
        # Admins have full access except delete
        all_pages = PagePermission.objects.filter(is_active=True)
        for page in all_pages:
            permissions.append({
                'path': page.path,
                'name': page.name,
                'category': page.category,
                'can_read': True,
                'can_write': True,
                'can_edit': True,
                'can_delete': False
            })
    else:
        # Regular users have specific permissions
        user_permissions = UserPageAccess.objects.filter(
            user=user,
            tenant=user.tenant
        ).select_related('page')
        
        for access in user_permissions:
            permissions.append({
                'path': access.page.path,
                'name': access.page.name,
                'category': access.page.category,
                'can_read': access.can_read,
                'can_write': access.can_write,
                'can_edit': access.can_edit,
                'can_delete': access.can_delete
            })
    
    return permissions