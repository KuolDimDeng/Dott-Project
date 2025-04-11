"""
Enhanced tenant middleware for Django applications

This middleware handles tenant context setting and validation with RLS support.
Key features:
1. Extracts tenant ID from request headers, path, or authenticated user
2. Validates tenant access permissions before allowing requests
3. Sets RLS context for database isolation
4. Provides detailed error handling and logging
"""

import logging
import uuid
import re
from django.http import HttpResponseForbidden, JsonResponse
from django.db import connection
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

from custom_auth.models import User, Tenant
from custom_auth.rls import set_tenant_in_db, get_current_tenant_id
from custom_auth.tenant_service import TenantManagementService

logger = logging.getLogger(__name__)

# UUID regex pattern to extract tenant IDs from URLs
UUID_PATTERN = r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'

class EnhancedTenantMiddleware(MiddlewareMixin):
    """
    Middleware that automatically sets tenant context for all database operations
    based on the tenant ID from the request.
    
    Supports extracting tenant ID from:
    1. URL path in format /<tenant-id>/...
    2. X-Tenant-ID header
    3. Authenticated user's tenant_id field
    
    Validates that the user has access to the requested tenant.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Paths that don't need tenant context
        self.public_paths = [
            '/api/auth/',
            '/api/session/',
            '/admin/',
            '/static/',
            '/media/',
            '/health/',
            '/api/tenant/verify/',
            '/api/tenant/create/',
            '/api/token/',
            '/onboarding/'
        ]
        
        # Path patterns that indicate tenant-specific routes
        self.tenant_path_patterns = [
            # Matches /tenant/12345-uuid/any-path
            re.compile(r'^/tenant/' + UUID_PATTERN + '/'),
            # Matches /12345-uuid/any-path
            re.compile(r'^/' + UUID_PATTERN + '/')
        ]
        
        super().__init__(get_response)
        
    def process_request(self, request):
        """
        Process the request before it reaches the view.
        Extract tenant ID and set the tenant context.
        """
        # Skip for public paths
        if any(request.path.startswith(path) for path in self.public_paths):
            # Clear tenant context for public paths
            set_tenant_in_db(None)
            return None
            
        # Extract tenant ID from request
        tenant_id = self._extract_tenant_id(request)
        request.tenant_id = tenant_id  # Store in request for views to use
        
        # If tenant ID found, validate access and set context
        if tenant_id:
            # For non-authenticated requests, we can only do basic validation
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                # Just check if tenant exists
                tenant = Tenant.objects.filter(id=tenant_id).first()
                if not tenant:
                    logger.warning(f"Tenant {tenant_id} not found for unauthenticated request to {request.path}")
                    return HttpResponseForbidden("Tenant not found")
                    
                # Set tenant context
                set_tenant_in_db(tenant_id)
                return None
                
            # For authenticated requests, validate tenant access
            user_id = request.user.id
            
            # Use tenant service to verify access
            result = TenantManagementService.verify_tenant_access(user_id, tenant_id)
            
            if not result['has_access']:
                # User doesn't have access to this tenant
                logger.warning(f"User {user_id} attempted to access tenant {tenant_id} without permission")
                
                if result['correct_tenant_id']:
                    # Return response with correct tenant ID
                    return JsonResponse({
                        'error': 'Tenant access denied',
                        'message': 'You do not have access to this tenant',
                        'correct_tenant_id': str(result['correct_tenant_id'])
                    }, status=403)
                else:
                    return HttpResponseForbidden("Tenant access denied")
            
            # Set tenant context for this request
            set_tenant_in_db(tenant_id)
            
        return None
        
    def process_response(self, request, response):
        """
        Process the response after the view has been called.
        Optionally add tenant-related headers and cleanup.
        """
        # Add tenant ID header if available
        tenant_id = getattr(request, 'tenant_id', None)
        if tenant_id:
            response['X-Tenant-ID'] = str(tenant_id)
        
        return response
        
    def _extract_tenant_id(self, request):
        """
        Extract tenant ID from various sources in the request.
        
        Sources checked (in order of priority):
        1. X-Tenant-ID header
        2. URL path format /<tenant-id>/...
        3. Authenticated user's tenant_id
        
        Returns:
            UUID or None: The extracted tenant ID or None if not found
        """
        # 1. Check header
        header_tenant_id = request.headers.get('X-Tenant-ID')
        if header_tenant_id:
            try:
                return uuid.UUID(header_tenant_id)
            except ValueError:
                logger.warning(f"Invalid tenant ID format in X-Tenant-ID header: {header_tenant_id}")
        
        # 2. Check URL path for tenant ID
        for pattern in self.tenant_path_patterns:
            match = pattern.match(request.path)
            if match:
                try:
                    return uuid.UUID(match.group(1))
                except ValueError:
                    logger.warning(f"Invalid tenant ID format in URL path: {match.group(1)}")
        
        # 3. Use authenticated user's tenant_id as fallback
        if hasattr(request, 'user') and request.user.is_authenticated:
            if hasattr(request.user, 'tenant_id') and request.user.tenant_id:
                return request.user.tenant_id
        
        return None 