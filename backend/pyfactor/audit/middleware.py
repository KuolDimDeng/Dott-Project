import uuid
import json
import logging
from threading import local
from django.utils.deprecation import MiddlewareMixin
from django.urls import resolve
from django.conf import settings

logger = logging.getLogger('audit')

# Thread-local storage for request context
_thread_locals = local()


def get_current_request():
    """Get the current request from thread-local storage."""
    return getattr(_thread_locals, 'request', None)


def get_current_user():
    """Get the current user from thread-local storage."""
    request = get_current_request()
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        return request.user
    return None


def get_current_tenant_id():
    """Get the current tenant_id from thread-local storage."""
    request = get_current_request()
    if request:
        # Try to get tenant_id from various sources
        if hasattr(request, 'tenant_id'):
            return request.tenant_id
        elif hasattr(request, 'session') and 'tenant_id' in request.session:
            return request.session.get('tenant_id')
        elif hasattr(request, 'user') and request.user.is_authenticated:
            # Try to get from user's tenant relationship
            try:
                if hasattr(request.user, 'tenant'):
                    return str(request.user.tenant.id)
            except:
                pass
    return None


class AuditMiddleware(MiddlewareMixin):
    """
    Middleware that captures request information for audit logging.
    Stores request context in thread-local storage for access by models and signals.
    """
    
    def process_request(self, request):
        """Store request information in thread-local storage."""
        # Generate a unique request ID for tracking related actions
        request.audit_request_id = str(uuid.uuid4())
        
        # Store request in thread-local storage
        _thread_locals.request = request
        
        # Add audit context to request
        request.audit_context = {
            'request_id': request.audit_request_id,
            'ip_address': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'session_key': request.session.session_key if hasattr(request, 'session') else None,
            'path': request.path,
            'method': request.method,
        }
        
        # Log API access for sensitive endpoints
        if self.should_log_access(request):
            self.log_api_access(request)
    
    def process_response(self, request, response):
        """Clean up thread-local storage."""
        if hasattr(_thread_locals, 'request'):
            del _thread_locals.request
        return response
    
    def get_client_ip(self, request):
        """Get the client's IP address from the request."""
        # Check for IP behind proxy
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def should_log_access(self, request):
        """Determine if this request should be logged for access audit."""
        # Skip static files and media
        if request.path.startswith(('/static/', '/media/')):
            return False
            
        # Skip health checks
        if request.path in ['/health/', '/api/health/', '/healthz/']:
            return False
            
        # Log all API endpoints
        if request.path.startswith('/api/'):
            return True
            
        # Log admin access
        if request.path.startswith('/admin/'):
            return True
            
        # Log based on method for data modification
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return True
            
        return False
    
    def log_api_access(self, request):
        """Log API access for audit trail."""
        try:
            from .models import AuditLog
            
            # Don't log if user is not authenticated (except for login attempts)
            if not request.user.is_authenticated and not request.path.endswith('/login/'):
                return
            
            # Get view name
            try:
                resolver = resolve(request.path)
                view_name = f"{resolver.view_name}"
            except:
                view_name = request.path
            
            # Log the access
            AuditLog.log_action(
                user=request.user if request.user.is_authenticated else None,
                tenant_id=get_current_tenant_id(),
                action='viewed' if request.method == 'GET' else 'accessed',
                model_name='API',
                object_id=view_name,
                object_repr=f"{request.method} {request.path}",
                ip_address=request.audit_context['ip_address'],
                user_agent=request.audit_context['user_agent'],
                request_id=request.audit_context['request_id'],
                session_key=request.audit_context['session_key'],
                extra_data={
                    'method': request.method,
                    'path': request.path,
                    'query_params': dict(request.GET),
                }
            )
        except Exception as e:
            logger.error(f"Failed to log API access: {str(e)}")


class AuditContextMiddleware(MiddlewareMixin):
    """
    Lightweight middleware that only sets audit context without logging.
    Use this if you want to handle logging separately.
    """
    
    def process_request(self, request):
        """Set up audit context."""
        request.audit_request_id = str(uuid.uuid4())
        _thread_locals.request = request