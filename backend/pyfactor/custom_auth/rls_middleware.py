import logging
import uuid
from django.db import connection
from django.http import HttpResponseForbidden
from asgiref.sync import sync_to_async
import asyncio
import time
import json
import traceback

logger = logging.getLogger(__name__)

class RowLevelSecurityMiddleware:
    """
    Middleware that sets PostgreSQL's Row Level Security (RLS) context
    based on tenant information for proper data isolation.
    
    Production-ready for use with AWS RDS and Cognito integration.
    
    This middleware:
    1. Extracts tenant ID from requests using multiple sources
    2. Sets the tenant context in the database for the current request
    3. Handles both synchronous and asynchronous requests
    4. Skips tenant context for public paths
    5. Adds tenant ID to response headers for debugging
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Public paths that don't need tenant context
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
            '/favicon.ico',
        ]
        
        # Check if RLS functions exist
        self._check_rls_functions()
        
    def _check_rls_functions(self):
        """Check if required RLS functions exist in the database"""
        try:
            logger.info("Checking if RLS functions exist for tenant isolation")
            
            with connection.cursor() as cursor:
                # Check if the main function exists
                try:
                    cursor.execute("SELECT get_tenant_context()")
                    result = cursor.fetchone()[0]
                    logger.info(f"RLS functions are properly configured (get_tenant_context returns '{result}')")
                except Exception as e:
                    logger.error(f"RLS functions appear to be missing: {e}")
                    logger.error("You MUST run fix_rls_direct.py to set up RLS properly before using the application")
                    logger.error("Without RLS functions, tenant isolation cannot be enforced")
        except Exception as e:
            logger.error(f"Error checking RLS functions: {e}")
            logger.error(traceback.format_exc())
    
    def __call__(self, request):
        """Process the request and set tenant context"""
        # Track timing for performance monitoring
        start_time = time.time()
        
        # Determine if this is an async request
        is_async = asyncio.iscoroutinefunction(self.get_response)
        
        # Skip tenant context for public paths (faster processing)
        if self._is_public_path(request.path):
            # Clear tenant context for safety on public paths
            if is_async:
                asyncio.create_task(self._clear_tenant_context_async())
            else:
                self._clear_tenant_context_sync()
            
            response = self.get_response(request)
            
            # Add debug headers for public paths
            response['X-RLS-Path-Type'] = 'public'
            
            return response
        
        # Extract tenant ID from request using multiple sources
        tenant_id = self._extract_tenant_id(request)
        
        if tenant_id:
            # Store for use in the application
            request.tenant_id = tenant_id
            
            # Set in database context
            if is_async:
                asyncio.create_task(self._set_tenant_context_async(tenant_id))
            else:
                self._set_tenant_context_sync(tenant_id)
            
            # Only log at debug level to avoid log spam in production
            logger.debug(f"Set tenant context to: {tenant_id}")
        else:
            # No tenant ID found, clear context
            if is_async:
                asyncio.create_task(self._clear_tenant_context_async())
            else:
                self._clear_tenant_context_sync()
            
            # Block access to tenant-specific resources if tenant ID is required
            if self._requires_tenant_id(request.path):
                logger.warning(f"Tenant ID required for access to: {request.path}")
                return HttpResponseForbidden("Tenant ID required for this resource")
        
        # Process the request
        response = self.get_response(request)
        
        # Add useful debugging headers in the response
        if hasattr(request, 'tenant_id') and request.tenant_id:
            response['X-Tenant-ID'] = str(request.tenant_id)
        
        # Add performance timing in debug header (useful for monitoring)
        processing_time = time.time() - start_time
        response['X-RLS-Processing-Time'] = f"{processing_time:.6f}s"
        
        return response
    
    def _is_public_path(self, path):
        """Check if the path is public (doesn't need tenant context)"""
        return any(path.startswith(prefix) for prefix in self.public_paths)
    
    def _requires_tenant_id(self, path):
        """Check if the path requires a tenant ID"""
        # API paths typically require tenant ID except for public ones
        if path.startswith('/api/'):
            if any(path.startswith(public) for public in self.public_paths):
                return False
            return True
        
        # Add other paths that require tenant ID
        tenant_required = [
            '/dashboard/',
            '/app/',
            '/tenant/',
            '/reports/',
        ]
        
        return any(path.startswith(prefix) for prefix in tenant_required)
    
    def _extract_tenant_id(self, request):
        """
        Extract tenant ID with multiple fallbacks:
        1. Request headers (most reliable)
        2. User object (Cognito attributes)
        3. Session
        4. Cookies (least reliable, only if no other option)
        
        Returns UUID object or None if not found.
        """
        tenant_id = None
        
        # 1. First try request headers (most reliable)
        tenant_id = self._get_tenant_from_headers(request)
        
        # 2. Try to get from authenticated user (e.g., Cognito)
        if not tenant_id and hasattr(request, 'user') and request.user.is_authenticated:
            tenant_id = self.get_tenant_id_from_user(request.user)
        
        # 3. Try session storage
        if not tenant_id and hasattr(request, 'session'):
            tenant_id = request.session.get('tenant_id')
        
        # 4. Finally try cookies (least reliable)
        if not tenant_id and hasattr(request, 'COOKIES'):
            tenant_id = request.COOKIES.get('tenantId')
        
        # Validate and convert to UUID if possible
        if tenant_id:
            try:
                return uuid.UUID(tenant_id)
            except (ValueError, TypeError):
                logger.warning(f"Invalid tenant ID format: {tenant_id}")
                return None
        
        return None
    
    def _get_tenant_from_headers(self, request):
        """Extract tenant ID from request headers"""
        # Try standard header
        tenant_id = request.headers.get('X-Tenant-ID')
        
        # Try alternative headers
        if not tenant_id:
            tenant_id = request.headers.get('Tenant-ID')
        
        if not tenant_id:
            tenant_id = request.headers.get('x-tenant')
        
        return tenant_id
    
    def get_tenant_id_from_user(self, user):
        """Extract tenant ID from user object with Auth0 support"""
        logger.debug(f"Extracting tenant ID from user {user}")
        
        try:
            # Direct tenant relationship
            if hasattr(user, 'tenant_id') and user.tenant_id:
                return str(user.tenant_id)
            
            # Try tenant relationship
            if hasattr(user, 'tenant') and user.tenant:
                return str(user.tenant.id)
                
        except Exception as e:
            logger.debug(f"Error extracting tenant ID: {e}")
        
        return None
    
    def _set_tenant_context_sync(self, tenant_id):
        """Set tenant context in database using standardized function"""
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT set_tenant_context(%s)",
                    [str(tenant_id)]
                )
            return True
        except Exception as e:
            logger.error(f"Error setting tenant context: {e}")
            return False
    
    def _clear_tenant_context_sync(self):
        """Clear tenant context in database"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT clear_tenant_context()")
            return True
        except Exception as e:
            logger.error(f"Error clearing tenant context: {e}")
            return False
    
    @sync_to_async
    def _set_tenant_context_async(self, tenant_id):
        """Set tenant context for async requests"""
        return self._set_tenant_context_sync(tenant_id)
    
    @sync_to_async
    def _clear_tenant_context_async(self):
        """Clear tenant context for async requests"""
        return self._clear_tenant_context_sync() 