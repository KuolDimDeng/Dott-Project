"""
Enhanced Row-Level Security (RLS) Middleware for Django with Auth0

This middleware automatically sets the database session's tenant context 
for each request based on tenant information from Auth0, headers, or session.

Features:
- Auth0 attribute integration
- Connection pooling compatibility 
- Fallback tenant extraction from multiple sources
- Handles async/sync requests
- Designed for production use
- Enhanced Auth0 support for tenant management endpoints

Author: Claude AI Assistant
Date: 2025-04-19
Updated: 2025-06-04 - Fixed Auth0 tenant endpoint handling
"""

import logging
import uuid
import time
from django.db import connection
from django.http import HttpResponseForbidden
from django.conf import settings
from asgiref.sync import sync_to_async
import asyncio
import traceback
import json

from .rls import fix_rls_configuration, set_tenant_context, clear_tenant_context

# Import Auth0 authentication with fallback
try:
    from custom_auth.auth0_authentication import Auth0JWTAuthentication
    AUTH0_AVAILABLE = True
    logger = logging.getLogger(__name__)
    logger.info("✅ Auth0JWTAuthentication imported successfully - tenant endpoints enabled")
except ImportError as e:
    AUTH0_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.error(f"❌ Failed to import Auth0JWTAuthentication: {e}")
    logger.error("🚫 Auth0 tenant endpoints will not work without this module")

class EnhancedRowLevelSecurityMiddleware:
    """
    Enhanced middleware that sets PostgreSQL's Row Level Security (RLS) context
    for each request based on tenant information from Auth0, headers, or session.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # URLs that don't need tenant context (public paths)
        self.public_paths = [
            '/api/auth/',
            '/api/session/',
            '/api/sessions/',  # Add session management endpoints
            '/admin/',
            '/static/',
            '/media/',
            '/onboarding/',
            '/api/token/refresh/',
            '/api/token/verify/',
            '/health/',
            '/api/public/',
            '/favicon.ico',
            '/api/hr/health/',
            '/api/hr/health',  # Add HR health endpoint as public
            '/api/diagnostic/',  # Temporary diagnostic endpoint for debugging
            '/api/diagnostic/restore/',  # Temporary restore endpoint for account restoration
            '/api/check-user/',  # User lookup endpoint for debugging
            '/api/onboarding/webhooks/stripe/',  # Stripe webhook doesn't have auth
        ]
        
        # Auth0 tenant management endpoints - require Auth0 authentication but can lookup/create tenant IDs
        self.auth0_tenant_endpoints = [
            '/api/users/me/',
            '/api/auth0/create-user/',
            '/api/user/create-auth0-user/',  # Frontend endpoint
            '/api/onboarding/business-info/',
            '/api/onboarding/subscription/',
            '/api/onboarding/complete',
            '/api/onboarding/',  # Catch-all for onboarding endpoints
            '/api/users/close-account/',  # Close account needs Auth0 authentication
            '/api/payments/create-subscription/',  # Stripe subscription creation during onboarding
        ]
        
        # Add custom public paths from settings if available
        try:
            custom_public_paths = getattr(settings, 'RLS_PUBLIC_PATHS', [])
            self.public_paths.extend(custom_public_paths)
        except Exception:
            pass
        
        # Log configuration details
        logger.info("🔧 EnhancedRowLevelSecurityMiddleware Configuration:")
        logger.info(f"   🔹 AUTH0_AVAILABLE: {AUTH0_AVAILABLE}")
        logger.info(f"   🔹 Public paths: {len(self.public_paths)} configured")
        logger.info(f"   🔹 Auth0 tenant endpoints: {len(self.auth0_tenant_endpoints)} configured")
        
        if AUTH0_AVAILABLE:
            logger.info("✅ Auth0 module available - tenant endpoints enabled")
            logger.debug(f"🔹 Auth0 tenant endpoints: {self.auth0_tenant_endpoints}")
        else:
            logger.warning("❌ Auth0 module NOT available - tenant endpoints will fail")
            
        logger.debug(f"🔹 Public paths: {self.public_paths}")
        
        # Initialize RLS functions in the database
        self._initialize_rls_functions()
        
    def _initialize_rls_functions(self):
        """Initialize the necessary RLS functions in the database"""
        try:
            logger.info("Initializing enhanced RLS functions for production")
            
            # Use our production-ready RLS configuration fix
            if fix_rls_configuration():
                logger.info("Successfully initialized enhanced RLS functions")
            else:
                logger.warning("Enhanced RLS initialization partially succeeded - will retry on first request")
                
        except Exception as e:
            logger.error(f"Error initializing enhanced RLS functions: {e}")
            logger.error(traceback.format_exc())
    
    def __call__(self, request):
        # Determine if this is an async request
        is_async = asyncio.iscoroutinefunction(self.get_response)
        
        # Skip tenant context for public paths
        if self._is_public_path(request.path):
            # For public paths, we still clear the tenant context for safety
            try:
                if is_async:
                    asyncio.create_task(self._set_tenant_context_async(None))
                else:
                    self._set_tenant_context_sync(None)
            except Exception as e:
                # Log but don't fail on error
                logger.debug(f"Error clearing tenant context: {e}")
                
            return self.get_response(request)
        
        # Handle Auth0 tenant management endpoints specially
        if self._is_auth0_tenant_endpoint(request.path):
            return self._handle_auth0_tenant_endpoint(request, is_async)
        
        # Extract tenant ID from multiple sources with fallbacks
        tenant_id = self._get_tenant_id(request)
        
        if tenant_id:
            # Store tenant ID in request for application use
            request.tenant_id = tenant_id
            
            # Set RLS tenant context
            try:
                if is_async:
                    asyncio.create_task(self._set_tenant_context_async(tenant_id))
                else:
                    self._set_tenant_context_sync(tenant_id)
                    
                logger.debug(f"Set tenant context to: {tenant_id}")
            except Exception as e:
                logger.error(f"Error setting tenant context: {e}")
                logger.error(traceback.format_exc())
                # Continue processing the request even if setting context fails
        else:
            # No tenant ID found - clear context for safety
            try:
                if is_async:
                    asyncio.create_task(self._set_tenant_context_async(None))
                else:
                    self._set_tenant_context_sync(None)
            except Exception as e:
                logger.debug(f"Error clearing tenant context: {e}")
            
            # Check if tenant is required for this path
            if self._requires_tenant(request.path):
                logger.warning(f"Access denied - tenant required: {request.path}")
                return HttpResponseForbidden("Tenant ID required for this resource")
        
        # Process the request
        response = self.get_response(request)
        
        # Add tenant header to response if available
        if hasattr(request, 'tenant_id') and request.tenant_id:
            response['X-Tenant-ID'] = str(request.tenant_id)
        
        return response
    
    def _is_public_path(self, path):
        """Check if the path is public (doesn't need tenant context)"""
        return any(path.startswith(public) for public in self.public_paths)
    
    def _requires_tenant(self, path):
        """Check if the path requires a tenant ID"""
        # API endpoints typically require tenant context
        if path.startswith('/api/'):
            # Skip auth and public endpoints
            if any(path.startswith(skip) for skip in self.public_paths):
                return False
            return True
        
        # Add other paths that require tenant ID here
        tenant_required_paths = [
            '/dashboard/',
            '/app/',
            '/private/',
        ]
        
        return any(path.startswith(req) for req in tenant_required_paths)
    
    def _get_tenant_id(self, request):
        """
        Extract tenant ID from multiple sources with fallbacks:
        1. Request headers
        2. User object (from Auth0)
        3. Session
        4. Cookies
        """
        tenant_id = None
        
        # 1. Try headers first (preferred method)
        tenant_id = self._get_tenant_from_headers(request)
        
        # 2. Try authenticated user
        if not tenant_id and hasattr(request, 'user') and request.user and request.user.is_authenticated:
            tenant_id = self._get_tenant_from_user(request.user)
        
        # 3. Try session
        if not tenant_id and hasattr(request, 'session'):
            tenant_id = request.session.get('tenant_id')
            
        # 4. Finally try cookies
        if not tenant_id and hasattr(request, 'COOKIES'):
            tenant_id = request.COOKIES.get('tenantId')
        
        # Validate and return as UUID if possible
        if tenant_id:
            try:
                return uuid.UUID(tenant_id)
            except (ValueError, TypeError):
                logger.warning(f"Invalid tenant ID format: {tenant_id}")
                return None
                
        return None
    
    def _get_tenant_from_headers(self, request):
        """Extract tenant ID from request headers"""
        # Try standard header first
        tenant_id = request.headers.get('X-Tenant-ID')
        
        # Try alternative headers if needed
        if not tenant_id:
            tenant_id = request.headers.get('x-tenant-id')
        
        if not tenant_id:
            tenant_id = request.headers.get('Tenant-ID')
            
        if not tenant_id:
            tenant_id = request.headers.get('x-tenant')
            
        # Try business ID headers as fallback (they are often the same as tenant ID)
        if not tenant_id:
            tenant_id = request.headers.get('X-Business-ID') or request.headers.get('x-business-id')
            
        return tenant_id
    
    def _get_tenant_from_user(self, user):
        """Extract tenant ID from user object"""
        # Try direct attribute first (most common)
        if hasattr(user, 'tenant_id'):
            return user.tenant_id
            
        # Try user.profile.tenant_id
        if hasattr(user, 'profile') and hasattr(user.profile, 'tenant_id'):
            return user.profile.tenant_id
            
        # Auth0 mode - no additional attribute extraction needed
        return None
    
    def _set_tenant_context_sync(self, tenant_id):
        """Set the PostgreSQL RLS tenant context synchronously"""
        try:
            # Use the database connection to set tenant context
            if tenant_id:
                set_tenant_context(str(tenant_id))
            else:
                clear_tenant_context()
                
            return True
        except Exception as e:
            logger.error(f"Error setting tenant context: {str(e)}")
            return False
    
    @sync_to_async
    def _set_tenant_context_async(self, tenant_id):
        """Set the PostgreSQL RLS tenant context asynchronously"""
        return self._set_tenant_context_sync(tenant_id)

    def _is_auth0_tenant_endpoint(self, path):
        """Check if the path is an Auth0 tenant management endpoint"""
        return any(path.startswith(endpoint) for endpoint in self.auth0_tenant_endpoints)

    def _handle_auth0_tenant_endpoint(self, request, is_async):
        """
        Handle Auth0 tenant management endpoints securely.
        These endpoints require Auth0 authentication but can create/lookup tenant IDs.
        """
        logger.info(f"🔐 Processing Auth0 tenant endpoint: {request.path}")
        logger.debug(f"🔍 Request method: {request.method}")
        logger.debug(f"🔍 Request headers: {dict(request.headers)}")
        
        if not AUTH0_AVAILABLE:
            logger.error("❌ Auth0JWTAuthentication not available - cannot handle Auth0 tenant endpoint")
            return HttpResponseForbidden("Auth0 authentication module not available")
        
        # Try multiple authentication methods
        auth_result = None
        user = None
        token = None
        
        # Check if request already has an authenticated user (from DRF authentication)
        if hasattr(request, 'user') and request.user and request.user.is_authenticated:
            logger.info(f"✅ Request already has authenticated user: {request.user}")
            user = request.user
            token = getattr(request, 'auth', None)
            auth_result = (user, token)
        else:
            # Try Session authentication first
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Session '):
                logger.debug(f"🔍 Attempting Session authentication for: {request.path}")
                try:
                    from session_manager.authentication import SessionAuthentication
                    session_auth = SessionAuthentication()
                    session_result = session_auth.authenticate(request)
                    if session_result:
                        user, session = session_result
                        auth_result = (user, session)
                        logger.info(f"✅ Session authentication successful for: {request.path}")
                except Exception as e:
                    logger.debug(f"Session auth failed: {e}")
            
            # If no session auth, try Auth0
            if not auth_result:
                logger.debug("🔍 Creating Auth0JWTAuthentication instance...")
                auth = Auth0JWTAuthentication()
                logger.debug(f"🔍 Attempting Auth0 authentication for: {request.path}")
                auth_result = auth.authenticate(request)
                
                if auth_result and isinstance(auth_result, tuple) and len(auth_result) == 2:
                    user, token = auth_result
                    logger.info(f"✅ Auth0 authentication successful for: {request.path}")
        
        if not auth_result or not user:
            logger.warning(f"❌ Authentication failed for tenant endpoint: {request.path}")
            logger.warning(f"❌ Auth result: {auth_result}")
            return HttpResponseForbidden("Authentication required")
        
        # Set the authenticated user on the request
        request.user = user
        request.auth = token if 'token' in locals() else None
        
        # For tenant management endpoints, we allow processing without initial tenant ID
        # but still maintain security through Auth0 authentication
        logger.info(f"✅ Tenant endpoint authenticated: {request.path} for user: {user}")
        
        # Clear tenant context for safety during tenant operations
        try:
            if is_async:
                asyncio.create_task(self._set_tenant_context_async(None))
            else:
                self._set_tenant_context_sync(None)
        except Exception as e:
            logger.debug(f"❌ Error clearing tenant context: {e}")
        
        # Process the request with authentication but no tenant context
        logger.debug(f"🔄 Processing authenticated request for: {request.path}")
        
        try:
            response = self.get_response(request)
            
            # Add security headers
            if hasattr(request, 'auth') and request.auth and hasattr(request.auth, '__class__') and 'Session' not in str(request.auth.__class__):
                response['X-Auth0-Verified'] = 'true'
            else:
                response['X-Session-Verified'] = 'true'
            logger.info(f"✅ Tenant endpoint request completed successfully: {request.path}")
            return response
            
        except Exception as e:
            logger.error(f"❌ Error processing tenant endpoint {request.path}: {e}")
            logger.error(f"❌ Error type: {type(e).__name__}")
            logger.error(f"❌ Error details: {str(e)}")
            
            # Log request details for debugging
            logger.debug(f"🔍 Request META keys: {list(request.META.keys())}")
            auth_header = request.META.get('HTTP_AUTHORIZATION', 'NOT_SET')
            logger.debug(f"🔍 Authorization header: {auth_header[:100] if auth_header != 'NOT_SET' else 'NOT_SET'}...")
            
            return HttpResponseForbidden("Request processing failed") 