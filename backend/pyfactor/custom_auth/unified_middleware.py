"""
Unified Middleware for Authentication, Tenant Isolation, and Security
Consolidates all middleware into a single, efficient implementation
"""

import logging
import uuid
import time
from django.db import connection
from django.http import HttpResponseForbidden, JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from .rls import set_current_tenant_id, clear_current_tenant_id

logger = logging.getLogger(__name__)


class UnifiedTenantMiddleware(MiddlewareMixin):
    """
    Single middleware that handles:
    1. Tenant context for Row-Level Security
    2. Request ID tracking
    3. Public path exemptions
    4. Webhook exemptions
    
    Industry best practice: One middleware per concern
    """
    
    # Paths that don't require authentication or tenant context
    PUBLIC_PATHS = [
        '/api/auth/',
        '/api/session/',
        '/api/sessions/',
        '/admin/',
        '/static/',
        '/media/',
        '/health/',
        '/favicon.ico',
        
        # Webhooks - never have user context
        '/api/payments/webhooks/',
        '/api/onboarding/webhooks/',
        
        # Public APIs
        '/api/public/',
        '/api/contact-form/',
        
        # Onboarding paths
        '/api/onboarding/pricing/',
        '/api/onboarding/complete/',
    ]
    
    # Paths that require auth but not tenant (during onboarding)
    AUTH_ONLY_PATHS = [
        '/api/users/me/',
        '/api/onboarding/business-info/',
        '/api/onboarding/subscription/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
        
        # Add custom paths from settings
        self.public_paths = self.PUBLIC_PATHS + getattr(settings, 'TENANT_EXEMPT_PATHS', [])
        self.auth_only_paths = self.AUTH_ONLY_PATHS + getattr(settings, 'TENANT_AUTH_ONLY_PATHS', [])
        
        logger.info(f"UnifiedTenantMiddleware initialized with {len(self.public_paths)} public paths")
    
    def process_request(self, request):
        """Process incoming request"""
        
        # Add request ID for tracing
        request.request_id = str(uuid.uuid4())[:8]
        
        logger.info(f"[UnifiedTenantMiddleware] Processing request {request.request_id} for path: {request.path}")
        
        # Check if path is public
        if self._is_public_path(request.path):
            logger.info(f"[UnifiedTenantMiddleware] Path {request.path} is public, no auth needed")
            clear_current_tenant_id()
            request.tenant_id = None
            return None
        
        # Check if path requires auth but not tenant
        if self._is_auth_only_path(request.path):
            logger.info(f"[UnifiedTenantMiddleware] Path {request.path} requires auth only (no tenant)")
            # For auth-only paths, don't check authentication in middleware
            # Let the view's authentication classes handle it (JWT or session)
            # This allows onboarding endpoints to use JWT authentication
            clear_current_tenant_id()
            request.tenant_id = None
            logger.info(f"[UnifiedTenantMiddleware] Allowing view to handle auth for {request.path}")
            return None
        
        # For all other paths, require both auth and tenant
        user = getattr(request, 'user', None)
        logger.info(f"[UnifiedTenantMiddleware] Path {request.path} requires tenant, checking user...")
        logger.info(f"[UnifiedTenantMiddleware] User object: {user}")
        logger.info(f"[UnifiedTenantMiddleware] User type: {type(user)}")
        logger.info(f"[UnifiedTenantMiddleware] Has user: {user is not None}")
        logger.info(f"[UnifiedTenantMiddleware] User authenticated: {user.is_authenticated if user else 'N/A'}")
        
        if not user or not user.is_authenticated:
            logger.warning(f"[UnifiedTenantMiddleware] Authentication required for {request.path} - user not authenticated")
            return JsonResponse({'error': 'Authentication required'}, status=401)
        
        # Get tenant ID from user
        tenant_id = getattr(user, 'tenant_id', None)
        
        if not tenant_id:
            # Try to get from user profile
            try:
                from users.models import UserProfile
                profile = UserProfile.objects.get(user=user)
                tenant_id = profile.tenant_id
            except:
                pass
        
        if not tenant_id:
            logger.warning(f"No tenant ID for authenticated user {user.email} accessing {request.path}")
            return HttpResponseForbidden("Tenant ID required for this resource")
        
        # Set tenant context
        request.tenant_id = tenant_id
        set_current_tenant_id(tenant_id)
        
        return None
    
    def process_response(self, request, response):
        """Clean up after request"""
        
        # Clear tenant context
        clear_current_tenant_id()
        
        # Add debugging headers
        if hasattr(request, 'request_id'):
            response['X-Request-ID'] = request.request_id
        
        if hasattr(request, 'tenant_id') and request.tenant_id:
            response['X-Tenant-ID'] = str(request.tenant_id)
        
        return response
    
    def process_exception(self, request, exception):
        """Handle exceptions"""
        clear_current_tenant_id()
        logger.error(f"Request {getattr(request, 'request_id', 'unknown')} failed: {exception}")
        return None
    
    def _is_public_path(self, path):
        """Check if path is public"""
        return any(path.startswith(p) for p in self.public_paths)
    
    def _is_auth_only_path(self, path):
        """Check if path requires auth but not tenant"""
        return any(path.startswith(p) for p in self.auth_only_paths)


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Separate middleware for security headers
    Following defense-in-depth principle
    """
    
    def process_response(self, request, response):
        """Add security headers to response"""
        
        # Content Security Policy - Industry standard with hash-based allowlist
        if not settings.DEBUG:
            # Build CSP from settings if available, otherwise use secure defaults
            csp_parts = []
            
            # Default source
            csp_parts.append("default-src 'self'")
            
            # Script sources - Using hash for auth scripts instead of unsafe-inline
            script_sources = getattr(settings, 'CSP_SCRIPT_SRC', (
                "'self'",
                # Hash for authentication scripts
                "'sha256-mHVJrqf405kt9COJfFfRNPGPFhA9M8E0mexi7ETxbsc='",
                "https://js.stripe.com",
                "https://client.crisp.chat",
                "https://cdn.plaid.com",
                "https://app.posthog.com",
                "https://accounts.google.com",
                "https://maps.googleapis.com",
                "https://auth.dottapps.com"
            ))
            csp_parts.append(f"script-src {' '.join(script_sources)}")
            
            # Style sources - keeping unsafe-inline temporarily for CSS frameworks
            style_sources = getattr(settings, 'CSP_STYLE_SRC', (
                "'self'",
                "'unsafe-inline'",  # TODO: Remove after migrating to nonce-based CSS
                "https://fonts.googleapis.com"
            ))
            csp_parts.append(f"style-src {' '.join(style_sources)}")
            
            # Font sources
            font_sources = getattr(settings, 'CSP_FONT_SRC', (
                "'self'",
                "data:",
                "https://fonts.gstatic.com"
            ))
            csp_parts.append(f"font-src {' '.join(font_sources)}")
            
            # Image sources
            img_sources = getattr(settings, 'CSP_IMG_SRC', (
                "'self'",
                "data:",
                "https:",
                "blob:"
            ))
            csp_parts.append(f"img-src {' '.join(img_sources)}")
            
            # Connect sources
            connect_sources = getattr(settings, 'CSP_CONNECT_SRC', (
                "'self'",
                "https://api.dottapps.com",
                "https://auth.dottapps.com",
                "https://*.stripe.com",
                "wss://*.crisp.chat",
                "https://*.crisp.chat",
                "https://*.plaid.com",
                "https://app.posthog.com"
            ))
            csp_parts.append(f"connect-src {' '.join(connect_sources)}")
            
            # Frame sources
            frame_sources = getattr(settings, 'CSP_FRAME_SRC', (
                "'self'",
                "https://js.stripe.com",
                "https://auth.dottapps.com",
                "https://client.crisp.chat",
                "https://*.plaid.com"
            ))
            csp_parts.append(f"frame-src {' '.join(frame_sources)}")
            
            # Object source - none for security
            csp_parts.append("object-src 'none'")
            
            # Base URI - self only
            csp_parts.append("base-uri 'self'")
            
            # Form action
            csp_parts.append("form-action 'self' https://auth.dottapps.com")
            
            # Upgrade insecure requests
            csp_parts.append("upgrade-insecure-requests")
            
            response['Content-Security-Policy'] = "; ".join(csp_parts)
        
        # Other security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # HSTS (only in production)
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response


class RateLimitMiddleware(MiddlewareMixin):
    """
    Simple rate limiting middleware
    Industry standard: Separate middleware for rate limiting
    """
    
    # Rate limits by path pattern
    RATE_LIMITS = {
        '/api/auth/': (5, 300),  # 5 requests per 5 minutes
        '/api/payments/': (10, 60),  # 10 requests per minute
        '/api/': (100, 60),  # 100 requests per minute for general API
    }
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.request_counts = {}  # In production, use Redis
        super().__init__(get_response)
    
    def process_request(self, request):
        """Check rate limits"""
        
        # Skip for internal/admin users
        if request.path.startswith('/admin/'):
            return None
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Check rate limits
        for path_pattern, (limit, window) in self.RATE_LIMITS.items():
            if request.path.startswith(path_pattern):
                key = f"{client_ip}:{path_pattern}"
                now = time.time()
                
                # Clean old entries (simplified - use Redis in production)
                if key not in self.request_counts:
                    self.request_counts[key] = []
                
                # Remove old timestamps
                self.request_counts[key] = [
                    t for t in self.request_counts[key] 
                    if now - t < window
                ]
                
                # Check limit
                if len(self.request_counts[key]) >= limit:
                    return JsonResponse({
                        'error': 'Rate limit exceeded',
                        'retry_after': window
                    }, status=429)
                
                # Add current request
                self.request_counts[key].append(now)
                break
        
        return None
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR', '0.0.0.0')