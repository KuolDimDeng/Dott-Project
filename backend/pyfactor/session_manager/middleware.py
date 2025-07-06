"""
Session Middleware
Handles session validation and updates for all requests
"""

import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.conf import settings

from .services import session_service

logger = logging.getLogger(__name__)


class SessionMiddleware(MiddlewareMixin):
    """
    Middleware to handle session management
    - Validates session tokens
    - Updates session activity
    - Handles session expiration
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Paths that don't require session
        self.exempt_paths = [
            '/api/auth/signin',
            '/api/auth/signup',
            '/api/auth/callback',
            '/api/health',
            '/admin',
            '/api/sessions/cloudflare/create',  # Add cloudflare session creation
        ]
    
    def process_request(self, request):
        """Process incoming request"""
        # Skip session check for exempt paths
        if any(request.path.startswith(path) for path in self.exempt_paths):
            return None
        
        # Get session token from cookie or header
        session_token = None
        
        # Check cookie first
        if 'session_token' in request.COOKIES:
            session_token = request.COOKIES['session_token']
        
        # Check Authorization header as fallback
        if not session_token:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Session '):
                session_token = auth_header[8:]
        
        if session_token:
            # Validate session
            session = session_service.get_session(session_token)
            
            if session and session.is_active and not session.is_expired():
                # Attach session to request
                request.session_obj = session
                request.user = session.user
                
                # Update activity timestamp
                session.update_activity()
            else:
                # Invalid or expired session
                request.session_obj = None
                request.user = None
        else:
            request.session_obj = None
            request.user = None
        
        return None
    
    def process_response(self, request, response):
        """Process outgoing response"""
        # If session was created or updated, ensure cookie is set
        if hasattr(request, 'new_session_token'):
            response.set_cookie(
                'session_token',
                request.new_session_token,
                max_age=settings.SESSION_COOKIE_AGE,
                httponly=True,
                secure=settings.SESSION_COOKIE_SECURE,
                samesite=settings.SESSION_COOKIE_SAMESITE,
                domain=settings.SESSION_COOKIE_DOMAIN,
                path='/'
            )
        
        return response


class SessionDebugMiddleware(MiddlewareMixin):
    """
    Debug middleware for session troubleshooting
    Only active in DEBUG mode
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = settings.DEBUG
    
    def process_request(self, request):
        """Log session information for debugging"""
        if not self.enabled:
            return None
        
        logger.debug(f"[SessionDebug] Request: {request.method} {request.path}")
        
        if hasattr(request, 'session_obj') and request.session_obj:
            session = request.session_obj
            logger.debug(f"[SessionDebug] Session ID: {session.session_id}")
            logger.debug(f"[SessionDebug] User: {session.user.email}")
            logger.debug(f"[SessionDebug] Tenant: {session.tenant_id}")
            logger.debug(f"[SessionDebug] Expires: {session.expires_at}")
        else:
            logger.debug("[SessionDebug] No active session")
        
        return None