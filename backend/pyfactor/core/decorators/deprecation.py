from functools import wraps
from django.http import JsonResponse
from rest_framework.response import Response
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def deprecated_endpoint(replacement_endpoint, removal_date="2025-02-01"):
    """
    Decorator to mark an endpoint as deprecated
    
    Usage:
        @deprecated_endpoint('/api/auth/session-v2')
        def old_session_view(request):
            ...
    
    Args:
        replacement_endpoint: The new endpoint to use instead
        removal_date: When this endpoint will be removed
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(*args, **kwargs):
            # Find request object (could be first arg or in args)
            request = None
            if args and hasattr(args[0], 'META'):
                request = args[0]
            elif len(args) > 1 and hasattr(args[1], 'META'):
                request = args[1]
                
            if request:
                # Log deprecation warning
                logger.warning(
                    f"DEPRECATED endpoint called: {request.path} "
                    f"Method: {request.method} "
                    f"IP: {request.META.get('REMOTE_ADDR', 'unknown')} "
                    f"User: {getattr(request.user, 'email', 'anonymous')} "
                    f"User-Agent: {request.META.get('HTTP_USER_AGENT', 'unknown')[:100]}"
                )
            
            # Call the original view
            response = view_func(*args, **kwargs)
            
            # Add deprecation headers
            deprecation_headers = {
                'X-Deprecated': 'true',
                'X-Deprecated-Since': '2025-01-23',
                'X-Deprecated-Removal': removal_date,
                'X-Replacement-Endpoint': replacement_endpoint,
                'Sunset': removal_date,  # RFC 8594 standard header
            }
            
            # Handle different response types
            if isinstance(response, Response):
                # Django REST Framework Response
                for header, value in deprecation_headers.items():
                    response[header] = value
                    
                # Add warning to response data
                if hasattr(response, 'data') and isinstance(response.data, dict):
                    response.data['_deprecation'] = {
                        'warning': f"This endpoint is deprecated and will be removed on {removal_date}.",
                        'use_instead': replacement_endpoint,
                        'deprecated_since': '2025-01-23',
                        'removal_date': removal_date
                    }
                    
            elif isinstance(response, JsonResponse):
                # Django JsonResponse
                for header, value in deprecation_headers.items():
                    response[header] = value
                    
            elif hasattr(response, '__setitem__'):
                # Regular HttpResponse
                for header, value in deprecation_headers.items():
                    response[header] = value
                    
            return response
            
        # Add attribute to identify deprecated views
        wrapped_view.is_deprecated = True
        wrapped_view.replacement_endpoint = replacement_endpoint
        wrapped_view.removal_date = removal_date
        
        return wrapped_view
    return decorator


def deprecated_class_view(replacement_endpoint, removal_date="2025-02-01"):
    """
    Decorator for class-based views to mark them as deprecated
    
    Usage:
        @deprecated_class_view('/api/auth/session-v2')
        class OldSessionView(APIView):
            ...
    """
    def decorator(cls):
        # Store original methods
        original_get = getattr(cls, 'get', None)
        original_post = getattr(cls, 'post', None)
        original_put = getattr(cls, 'put', None)
        original_patch = getattr(cls, 'patch', None)
        original_delete = getattr(cls, 'delete', None)
        
        # Wrap each HTTP method
        if original_get:
            cls.get = deprecated_endpoint(replacement_endpoint, removal_date)(original_get)
        if original_post:
            cls.post = deprecated_endpoint(replacement_endpoint, removal_date)(original_post)
        if original_put:
            cls.put = deprecated_endpoint(replacement_endpoint, removal_date)(original_put)
        if original_patch:
            cls.patch = deprecated_endpoint(replacement_endpoint, removal_date)(original_patch)
        if original_delete:
            cls.delete = deprecated_endpoint(replacement_endpoint, removal_date)(original_delete)
            
        # Mark class as deprecated
        cls.is_deprecated = True
        cls.replacement_endpoint = replacement_endpoint
        cls.removal_date = removal_date
        
        return cls
    return decorator