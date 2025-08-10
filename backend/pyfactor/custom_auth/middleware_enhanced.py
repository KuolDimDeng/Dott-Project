"""
Enhanced middleware for complete tenant isolation.
Sets tenant context at database level for RLS policies.
"""
import logging
import json
from datetime import datetime
from django.db import connection
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from custom_auth.rls import set_current_tenant_id, clear_current_tenant_id

logger = logging.getLogger('security.tenant')


class EnhancedTenantMiddleware:
    """
    Middleware that sets tenant context for EVERY request.
    This ensures database-level RLS policies work correctly.
    """
    
    # Paths that don't require tenant context
    PUBLIC_PATHS = [
        '/health/',
        '/api/auth/signin',
        '/api/auth/signup',
        '/api/auth/password-reset',
        '/api/auth/password-login/',
        '/api/auth/session-v2',
        '/api/auth/session-verify',
        '/api/auth/session/',
        '/api/auth/google/',
        '/api/auth/refresh/',
        '/admin/',
        '/static/',
        '/media/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.security_log = []
    
    def __call__(self, request):
        # Check if path is public
        is_public = any(request.path.startswith(p) for p in self.PUBLIC_PATHS)
        
        # Initialize tenant context
        tenant_id = None
        
        try:
            # Check if user exists and is authenticated (safely)
            if not is_public and hasattr(request, 'user') and request.user.is_authenticated:
                # Get tenant_id from user
                tenant_id = getattr(request.user, 'tenant_id', None) or \
                           getattr(request.user, 'business_id', None)
                
                if not tenant_id:
                    # Log security event
                    self.log_security_event(
                        request=request,
                        event_type='NO_TENANT_CONTEXT',
                        severity='CRITICAL',
                        message=f"Authenticated user {request.user.email} has no tenant_id"
                    )
                    
                    # Block the request
                    return JsonResponse({
                        'error': 'User not associated with any tenant',
                        'code': 'NO_TENANT_CONTEXT'
                    }, status=403)
                
                # Set tenant context at database level for RLS
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SET LOCAL app.current_tenant_id = %s",
                        [str(tenant_id)]
                    )
                
                # Also set in Python context
                set_current_tenant_id(tenant_id)
                
                # Add tenant_id to request for easy access
                request.tenant_id = tenant_id
                
                # Log successful tenant context
                logger.debug(
                    f"Tenant context set: {tenant_id} for user {request.user.email}"
                )
            
            # Process request
            response = self.get_response(request)
            
            # Log successful request
            if tenant_id and response.status_code >= 400:
                self.log_security_event(
                    request=request,
                    event_type='REQUEST_ERROR',
                    severity='WARNING',
                    tenant_id=tenant_id,
                    status_code=response.status_code
                )
            
            return response
            
        except Exception as e:
            # Log error
            self.log_security_event(
                request=request,
                event_type='MIDDLEWARE_ERROR',
                severity='ERROR',
                error=str(e),
                tenant_id=tenant_id
            )
            
            # Return error response
            return JsonResponse({
                'error': 'Internal server error',
                'code': 'MIDDLEWARE_ERROR'
            }, status=500)
            
        finally:
            # Always clear tenant context
            if tenant_id:
                clear_current_tenant_id()
                
                # Clear from database session
                try:
                    with connection.cursor() as cursor:
                        cursor.execute("RESET app.current_tenant_id")
                except:
                    pass
    
    def log_security_event(self, request, event_type, severity='INFO', **kwargs):
        """Log security events to database and monitoring."""
        
        event = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'severity': severity,
            'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') else None,
            'user_email': getattr(request.user, 'email', 'anonymous') if hasattr(request, 'user') else 'anonymous',
            'ip_address': self.get_client_ip(request),
            'path': request.path,
            'method': request.method,
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            **kwargs
        }
        
        # Log to file
        logger.log(
            logging.ERROR if severity in ['ERROR', 'CRITICAL'] else logging.WARNING,
            f"SECURITY_EVENT: {json.dumps(event)}"
        )
        
        # Store in database (async to not block request)
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO security_audit_log 
                    (event_type, severity, user_id, user_email, tenant_id, 
                     ip_address, path, method, details)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, [
                    event_type,
                    severity,
                    event.get('user_id'),
                    event.get('user_email'),
                    kwargs.get('tenant_id'),
                    event.get('ip_address'),
                    request.path,
                    request.method,
                    json.dumps(kwargs)
                ])
        except Exception as e:
            logger.error(f"Failed to log security event to database: {str(e)}")
    
    def get_client_ip(self, request):
        """Get the real client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('HTTP_X_REAL_IP') or \
                request.META.get('REMOTE_ADDR', '0.0.0.0')
        return ip


class CrossTenantAccessMonitor:
    """
    Middleware to detect and prevent cross-tenant access attempts.
    This is a second layer of defense.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Track the initial tenant
        initial_tenant = getattr(request, 'tenant_id', None)
        
        # Process request
        response = self.get_response(request)
        
        # Check if response contains data from wrong tenant
        if initial_tenant and hasattr(response, 'data'):
            self.validate_response_data(response.data, initial_tenant, request)
        
        return response
    
    def validate_response_data(self, data, expected_tenant, request):
        """
        Validate that response data belongs to the correct tenant.
        This is a safety check to catch any bugs in filtering.
        """
        if isinstance(data, dict):
            # Check for tenant_id in response
            if 'tenant_id' in data and str(data['tenant_id']) != str(expected_tenant):
                user_email = getattr(request.user, 'email', 'unknown') if hasattr(request, 'user') else 'anonymous'
                logger.critical(
                    f"CRITICAL: Cross-tenant data detected! "
                    f"Expected: {expected_tenant}, Got: {data['tenant_id']} "
                    f"Path: {request.path}, User: {user_email}"
                )
                # This should trigger immediate alerts
                
        elif isinstance(data, list):
            # Check each item in list
            for item in data:
                if isinstance(item, dict) and 'tenant_id' in item:
                    if str(item['tenant_id']) != str(expected_tenant):
                        user_email = getattr(request.user, 'email', 'unknown') if hasattr(request, 'user') else 'anonymous'
                        logger.critical(
                            f"CRITICAL: Cross-tenant data in list! "
                            f"Expected: {expected_tenant}, Got: {item['tenant_id']} "
                            f"Path: {request.path}, User: {user_email}"
                        )
                        # This should trigger immediate alerts