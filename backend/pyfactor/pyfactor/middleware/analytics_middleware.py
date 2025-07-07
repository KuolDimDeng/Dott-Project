import time
from django.utils.deprecation import MiddlewareMixin
from pyfactor.analytics import track_api_call, init_posthog

# Initialize PostHog when the middleware loads
try:
    init_posthog()
except Exception as e:
    print(f"Warning: Failed to initialize PostHog: {e}")

class AnalyticsMiddleware(MiddlewareMixin):
    """Middleware to track API calls and performance metrics"""
    
    def process_request(self, request):
        """Mark the start time of the request"""
        request._analytics_start_time = time.time()
    
    def process_response(self, request, response):
        """Track the API call after processing"""
        # Skip tracking for static files and non-API endpoints
        if request.path.startswith('/static/') or request.path.startswith('/media/'):
            return response
        
        # Calculate request duration
        duration_ms = None
        if hasattr(request, '_analytics_start_time'):
            duration_ms = int((time.time() - request._analytics_start_time) * 1000)
        
        # Get user ID if authenticated
        user_id = None
        if hasattr(request, 'user') and request.user and request.user.is_authenticated:
            user_id = str(request.user.id)
        
        # Track API endpoints
        if request.path.startswith('/api/'):
            track_api_call(
                user_id=user_id,
                endpoint=request.path,
                method=request.method,
                status_code=response.status_code,
                duration_ms=duration_ms
            )
        
        return response