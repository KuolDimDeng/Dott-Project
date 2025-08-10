"""
Admin portal security configuration and utilities
"""
import os
import secrets
import hashlib
import time
from datetime import datetime, timedelta
from functools import wraps
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
import pyotp
import qrcode
import io
import base64


class AdminSecurityConfig:
    """
    Centralized security configuration for admin portal
    """
    # JWT Configuration
    ADMIN_JWT_SECRET = os.environ.get('ADMIN_JWT_SECRET', settings.SECRET_KEY + '_admin')
    ADMIN_JWT_ALGORITHM = 'HS256'
    ADMIN_JWT_EXPIRY_HOURS = 8
    ADMIN_REFRESH_TOKEN_EXPIRY_DAYS = 7
    
    # Rate limiting
    LOGIN_RATE_LIMIT = 5  # attempts
    LOGIN_RATE_WINDOW = 900  # 15 minutes
    API_RATE_LIMIT = 100  # requests
    API_RATE_WINDOW = 60  # 1 minute
    
    # Session configuration
    SESSION_TIMEOUT_MINUTES = 30  # Idle timeout
    SESSION_ABSOLUTE_TIMEOUT_HOURS = 8  # Absolute timeout
    SESSION_WARNING_MINUTES = 5  # Warning before timeout
    
    # Security headers - SECURITY: Removed unsafe-inline and unsafe-eval
    # Note: Admin panel may need refactoring if inline scripts are used
    CSP_POLICY = (
        "default-src 'self'; "
        "script-src 'self' https://cdn.jsdelivr.net https://js.stripe.com https://accounts.google.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "  # TODO: Remove unsafe-inline for styles
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://api.dottapps.com wss://api.dottapps.com; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )
    
    # MFA Configuration
    MFA_ISSUER_NAME = 'Dott Admin Portal'
    MFA_QR_SIZE = 200
    MFA_BACKUP_CODES_COUNT = 10
    
    # IP Whitelist Configuration
    GLOBAL_IP_WHITELIST = os.environ.get('ADMIN_GLOBAL_IP_WHITELIST', '').split(',')
    ENABLE_GLOBAL_IP_WHITELIST = bool(GLOBAL_IP_WHITELIST[0])
    
    # CSRF Configuration
    CSRF_TOKEN_LENGTH = 32
    CSRF_TOKEN_EXPIRY_HOURS = 24


class RateLimiter:
    """
    Rate limiting implementation using Django cache
    """
    @staticmethod
    def check_rate_limit(key, limit, window):
        """
        Check if rate limit is exceeded
        """
        current_count = cache.get(key, 0)
        if current_count >= limit:
            return False, current_count
        
        # Increment counter
        try:
            current_count = cache.incr(key)
        except ValueError:
            # Key doesn't exist, set it
            cache.set(key, 1, window)
            current_count = 1
        
        return True, current_count
    
    @staticmethod
    def reset_rate_limit(key):
        """
        Reset rate limit for a key
        """
        cache.delete(key)


def rate_limit(limit_type='api'):
    """
    Decorator for rate limiting
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(view_instance, request, *args, **kwargs):
            # Determine rate limit parameters
            if limit_type == 'login':
                limit = AdminSecurityConfig.LOGIN_RATE_LIMIT
                window = AdminSecurityConfig.LOGIN_RATE_WINDOW
                key = f"admin_login_rate_{request.META.get('REMOTE_ADDR')}"
            else:
                limit = AdminSecurityConfig.API_RATE_LIMIT
                window = AdminSecurityConfig.API_RATE_WINDOW
                if hasattr(request, 'admin_user'):
                    key = f"admin_api_rate_{request.admin_user.id}"
                else:
                    key = f"admin_api_rate_{request.META.get('REMOTE_ADDR')}"
            
            # Check rate limit
            allowed, current_count = RateLimiter.check_rate_limit(key, limit, window)
            
            if not allowed:
                return Response({
                    'error': 'Rate limit exceeded',
                    'retry_after': window,
                    'limit': limit
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            # Add rate limit headers to response
            response = view_func(view_instance, request, *args, **kwargs)
            response['X-RateLimit-Limit'] = str(limit)
            response['X-RateLimit-Remaining'] = str(limit - current_count)
            response['X-RateLimit-Reset'] = str(int(time.time()) + window)
            
            return response
        
        return wrapped_view
    return decorator


class MFAManager:
    """
    Multi-Factor Authentication manager
    """
    @staticmethod
    def generate_secret():
        """
        Generate a new TOTP secret
        """
        return pyotp.random_base32()
    
    @staticmethod
    def generate_qr_code(admin_user, secret):
        """
        Generate QR code for TOTP setup
        """
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=admin_user.email,
            issuer_name=AdminSecurityConfig.MFA_ISSUER_NAME
        )
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        
        return base64.b64encode(buffer.getvalue()).decode()
    
    @staticmethod
    def verify_token(secret, token):
        """
        Verify TOTP token
        """
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)
    
    @staticmethod
    def generate_backup_codes():
        """
        Generate backup codes for MFA
        """
        codes = []
        for _ in range(AdminSecurityConfig.MFA_BACKUP_CODES_COUNT):
            code = secrets.token_hex(4).upper()
            codes.append(f"{code[:4]}-{code[4:]}")
        return codes
    
    @staticmethod
    def hash_backup_code(code):
        """
        Hash backup code for storage
        """
        return hashlib.sha256(code.encode()).hexdigest()


class CSRFProtection:
    """
    CSRF protection for admin portal
    """
    @staticmethod
    def generate_token(admin_user_id):
        """
        Generate CSRF token
        """
        token_data = f"{admin_user_id}:{time.time()}"
        random_data = secrets.token_urlsafe(AdminSecurityConfig.CSRF_TOKEN_LENGTH)
        return f"{random_data}:{hashlib.sha256(token_data.encode()).hexdigest()}"
    
    @staticmethod
    def validate_token(token, admin_user_id):
        """
        Validate CSRF token
        """
        if not token or ':' not in token:
            return False
        
        # For now, implement basic validation
        # In production, would store tokens in cache/database
        return True


class SecurityHeaders:
    """
    Security headers for admin portal
    """
    @staticmethod
    def get_headers():
        """
        Get security headers dictionary
        """
        return {
            'Content-Security-Policy': AdminSecurityConfig.CSP_POLICY,
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    
    @staticmethod
    def apply_to_response(response):
        """
        Apply security headers to response
        """
        headers = SecurityHeaders.get_headers()
        for key, value in headers.items():
            response[key] = value
        return response


def require_mfa(view_func):
    """
    Decorator to require MFA for sensitive operations
    """
    @wraps(view_func)
    def wrapped_view(view_instance, request, *args, **kwargs):
        if not hasattr(request, 'admin_user'):
            return Response({
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user has MFA enabled
        if request.admin_user.mfa_enabled and not request.session.get('mfa_verified'):
            return Response({
                'error': 'MFA verification required',
                'mfa_required': True
            }, status=status.HTTP_403_FORBIDDEN)
        
        return view_func(view_instance, request, *args, **kwargs)
    
    return wrapped_view


def log_security_event(admin_user, event_type, details, request, success=True):
    """
    Log security-related events
    """
    from .models import AdminAuditLog
    
    AdminAuditLog.objects.create(
        admin_user=admin_user,
        action=event_type,
        details=details,
        ip_address=request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR'),
        user_agent=request.headers.get('User-Agent', ''),
        success=success,
        error_message=details.get('error', '') if not success else ''
    )