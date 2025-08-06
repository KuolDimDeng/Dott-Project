"""
Unified Session Middleware
Consolidates all session-related middleware into one efficient implementation
"""

import logging
import json
import hashlib
import time
from datetime import datetime, timedelta
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class UnifiedSessionMiddleware(MiddlewareMixin):
    """
    Consolidates:
    - SessionMiddleware
    - SessionSecurityMiddleware  
    - DeviceFingerprintMiddleware
    - SessionHeartbeatMiddleware
    
    Into one efficient middleware
    """
    
    # Session configuration
    SESSION_TIMEOUT = getattr(settings, 'SESSION_TIMEOUT', 3600 * 24)  # 24 hours
    SESSION_HEARTBEAT_INTERVAL = 300  # 5 minutes
    SESSION_WARNING_TIME = 60  # 1 minute warning before timeout
    
    # Paths that don't need session validation
    SESSION_EXEMPT_PATHS = [
        '/api/auth/signin',
        '/api/auth/signup', 
        '/api/auth/session-v2',  # Industry-standard session management v2
        '/api/auth/password-login/',  # Password-based authentication endpoint
        '/api/auth/register/',  # Email/password registration
        '/api/auth/oauth-exchange/',  # OAuth token exchange
        '/api/auth/deployment-check/',  # Deployment verification
        '/api/auth/forgot-password',
        '/api/sessions/public/',  # Public session verification after login
        '/api/sessions/validate/',  # Session validation endpoint
        '/api/sessions/consolidated-auth/',  # Consolidated auth session creation
        '/api/sessions/',  # General session endpoints (for specific session IDs)
        '/api/payments/webhooks/',
        '/api/onboarding/webhooks/',
        '/api/contact-form/',  # Public contact form submissions
        '/admin/',  # Django admin uses its own authentication
        '/health/',
        '/static/',
        '/media/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
        logger.info("UnifiedSessionMiddleware initialized")
    
    def process_request(self, request):
        """Process incoming request for session management"""
        
        # Skip session checks for exempt paths
        if self._is_exempt_path(request.path):
            return None
        
        # Get session from request
        session = self._get_session(request)
        
        if not session:
            # No session for non-exempt path
            if request.path.startswith('/api/'):
                return JsonResponse({
                    'error': 'Session required',
                    'code': 'SESSION_REQUIRED'
                }, status=401)
            return None
        
        # Validate session
        validation_result = self._validate_session(session, request)
        
        if not validation_result['valid']:
            if request.path.startswith('/api/'):
                return JsonResponse({
                    'error': validation_result['reason'],
                    'code': validation_result['code']
                }, status=401)
            return None
        
        # Update session activity
        self._update_session_activity(session)
        
        # Attach session to request
        request.session_data = session
        request.user = session.get('user')
        
        # Device fingerprint validation (if enabled)
        if getattr(settings, 'ENFORCE_DEVICE_FINGERPRINT', False):
            if not self._validate_fingerprint(session, request):
                logger.warning(f"Device fingerprint mismatch for session {session.get('id')}")
                if getattr(settings, 'STRICT_FINGERPRINT_ENFORCEMENT', False):
                    return JsonResponse({
                        'error': 'Device verification failed',
                        'code': 'DEVICE_MISMATCH'
                    }, status=403)
        
        return None
    
    def process_response(self, request, response):
        """Add session headers to response"""
        
        if hasattr(request, 'session_data'):
            session = request.session_data
            
            # Add session headers
            response['X-Session-ID'] = session.get('id', '')
            
            # Calculate time until timeout
            last_activity = session.get('last_activity', 0)
            time_until_timeout = max(0, (last_activity + self.SESSION_TIMEOUT) - time.time())
            
            # Add timeout warning if needed
            if time_until_timeout <= self.SESSION_WARNING_TIME:
                response['X-Session-Warning'] = 'timeout_imminent'
                response['X-Session-Timeout-In'] = str(int(time_until_timeout))
            
            # Add heartbeat requirement
            response['X-Session-Heartbeat-Required'] = str(self.SESSION_HEARTBEAT_INTERVAL)
        
        return response
    
    def _is_exempt_path(self, path):
        """Check if path is exempt from session requirements"""
        return any(path.startswith(p) for p in self.SESSION_EXEMPT_PATHS)
    
    def _get_session(self, request):
        """Get session from request (cookie, header, or database)"""
        
        # Try cookie first
        session_id = request.COOKIES.get('sid')
        
        # Try Authorization header
        if not session_id:
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Session '):
                session_id = auth_header[8:]
        
        if not session_id:
            return None
        
        # Get session from database
        try:
            from session_manager.models import Session
            session_obj = Session.objects.get(
                session_id=session_id,
                is_active=True
            )
            
            return {
                'id': session_id,
                'user': session_obj.user,
                'created_at': session_obj.created_at.timestamp(),
                'last_activity': session_obj.last_activity.timestamp(),
                'ip_address': session_obj.ip_address,
                'user_agent': session_obj.user_agent,
                'device_fingerprint': session_obj.device_fingerprint,
                'data': json.loads(session_obj.session_data or '{}')
            }
        except Exception as e:
            logger.debug(f"Session not found or invalid: {e}")
            return None
    
    def _validate_session(self, session, request):
        """Validate session is still valid"""
        
        # Check timeout
        now = time.time()
        last_activity = session.get('last_activity', 0)
        
        if now - last_activity > self.SESSION_TIMEOUT:
            return {
                'valid': False,
                'reason': 'Session timeout',
                'code': 'SESSION_TIMEOUT'
            }
        
        # Check IP if strict mode
        if getattr(settings, 'STRICT_IP_VALIDATION', False):
            session_ip = session.get('ip_address')
            request_ip = self._get_client_ip(request)
            
            if session_ip and request_ip != session_ip:
                logger.warning(f"IP mismatch: session={session_ip}, request={request_ip}")
                return {
                    'valid': False,
                    'reason': 'IP address mismatch',
                    'code': 'IP_MISMATCH'
                }
        
        return {'valid': True}
    
    def _validate_fingerprint(self, session, request):
        """Validate device fingerprint"""
        
        stored_fingerprint = session.get('device_fingerprint')
        if not stored_fingerprint:
            return True  # No fingerprint stored, skip validation
        
        current_fingerprint = self._generate_fingerprint(request)
        return stored_fingerprint == current_fingerprint
    
    def _generate_fingerprint(self, request):
        """Generate device fingerprint from request"""
        
        components = [
            request.META.get('HTTP_USER_AGENT', ''),
            request.META.get('HTTP_ACCEPT_LANGUAGE', ''),
            request.META.get('HTTP_ACCEPT_ENCODING', ''),
            # Don't include IP in fingerprint as it can change
        ]
        
        fingerprint_string = '|'.join(components)
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()[:32]
    
    def _update_session_activity(self, session):
        """Update session last activity time"""
        
        try:
            from session_manager.models import Session
            Session.objects.filter(session_id=session['id']).update(
                last_activity=timezone.now()
            )
        except Exception as e:
            logger.error(f"Failed to update session activity: {e}")
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        
        # Check for Cloudflare
        cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
        if cf_ip:
            return cf_ip
        
        # Check for proxy
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        
        # Direct connection
        return request.META.get('REMOTE_ADDR', '')