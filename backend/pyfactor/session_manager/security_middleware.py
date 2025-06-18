"""
Enhanced Security Middleware
Integrates device fingerprinting and risk assessment into request processing
"""

import json
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.core.cache import cache
from .security_service import security_service
from .models import UserSession


class SessionSecurityMiddleware(MiddlewareMixin):
    """
    Middleware to enforce session security policies
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.exempt_paths = [
            '/api/auth/login',
            '/api/auth/signup',
            '/api/auth/callback',
            '/api/sessions/',
            '/api/health/',
            '/static/',
            '/media/',
        ]
    
    def process_request(self, request):
        """Process incoming request for security checks"""
        # Skip security checks for exempt paths
        if any(request.path.startswith(path) for path in self.exempt_paths):
            return None
        
        # Skip if no session
        if not hasattr(request, 'session_obj') or not request.session_obj:
            return None
        
        # Get request data for security validation
        request_data = {
            'ip_address': self._get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'path': request.path,
            'method': request.method,
        }
        
        # Validate session security
        validation_result = security_service.validate_session_security(
            request.session_obj,
            request_data
        )
        
        # Handle validation result
        if not validation_result['valid']:
            return JsonResponse({
                'error': 'Session terminated due to security concerns',
                'code': 'SESSION_SECURITY_VIOLATION'
            }, status=403)
        
        # Handle different security actions
        if validation_result['action'] == 'challenge':
            # Store challenge requirement in request
            request.requires_challenge = True
            request.challenge_reason = validation_result.get('anomalies', [])
        
        elif validation_result['action'] == 'verify':
            # Store verification requirement
            request.requires_verification = True
        
        # Store security info in request
        request.session_security = validation_result
        
        return None
    
    def process_response(self, request, response):
        """Process outgoing response"""
        # Add security headers if session requires verification
        if hasattr(request, 'requires_verification') and request.requires_verification:
            response['X-Requires-Verification'] = 'true'
        
        if hasattr(request, 'requires_challenge') and request.requires_challenge:
            response['X-Requires-Challenge'] = 'true'
            response['X-Challenge-Reason'] = json.dumps(request.challenge_reason)
        
        # Add risk score header for monitoring
        if hasattr(request, 'session_security'):
            response['X-Session-Risk-Score'] = str(request.session_security.get('risk_score', 0))
        
        return response
    
    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class DeviceFingerprintMiddleware(MiddlewareMixin):
    """
    Middleware to collect and process device fingerprints
    """
    
    def process_request(self, request):
        """Extract device fingerprint from request"""
        # Check for fingerprint in headers
        fingerprint_data = None
        
        # Try to get fingerprint from custom header
        fingerprint_header = request.META.get('HTTP_X_DEVICE_FINGERPRINT')
        if fingerprint_header:
            try:
                fingerprint_data = json.loads(fingerprint_header)
            except json.JSONDecodeError:
                pass
        
        # Try to get fingerprint from request body (for POST requests)
        if not fingerprint_data and request.method == 'POST':
            try:
                body = json.loads(request.body.decode('utf-8'))
                fingerprint_data = body.get('deviceFingerprint')
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass
        
        # Store fingerprint data in request
        if fingerprint_data:
            request.device_fingerprint = fingerprint_data
        
        return None


class SessionHeartbeatMiddleware(MiddlewareMixin):
    """
    Middleware to handle session heartbeat updates
    """
    
    def process_request(self, request):
        """Update session heartbeat on activity"""
        # Skip heartbeat for certain paths
        heartbeat_exempt = [
            '/api/sessions/heartbeat',
            '/api/health/',
            '/static/',
            '/media/',
        ]
        
        if any(request.path.startswith(path) for path in heartbeat_exempt):
            return None
        
        # Update heartbeat if session exists
        if hasattr(request, 'session_obj') and request.session_obj:
            session_id = str(request.session_obj.session_id)
            
            # Use cache to prevent too frequent updates
            cache_key = f'heartbeat_updated:{session_id}'
            if not cache.get(cache_key):
                security_service.update_session_heartbeat(session_id)
                cache.set(cache_key, True, timeout=30)  # Update at most every 30 seconds
        
        return None