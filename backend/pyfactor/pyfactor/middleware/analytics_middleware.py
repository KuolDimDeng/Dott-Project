import time
import logging
from django.utils.deprecation import MiddlewareMixin
from pyfactor.analytics import track_api_call, init_posthog

logger = logging.getLogger(__name__)

# Initialize PostHog when the middleware loads
_analytics_enabled = False
try:
    init_posthog()
    # Check if analytics is actually enabled
    from pyfactor.analytics import _posthog_initialized
    _analytics_enabled = _posthog_initialized
    if not _analytics_enabled:
        logger.info("Analytics middleware: PostHog not enabled (no API key)")
except Exception as e:
    logger.warning(f"Analytics middleware: Failed to initialize PostHog: {e}")
    _analytics_enabled = False

class AnalyticsMiddleware(MiddlewareMixin):
    """Middleware to track API calls and performance metrics"""
    
    def process_request(self, request):
        """Mark the start time of the request"""
        request._analytics_start_time = time.time()
    
    def process_response(self, request, response):
        """Track the API call after processing"""
        # Skip if analytics is not enabled
        if not _analytics_enabled:
            return response
            
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
            try:
                track_api_call(
                    user_id=user_id,
                    endpoint=request.path,
                    method=request.method,
                    status_code=response.status_code,
                    duration_ms=duration_ms
                )
            except Exception as e:
                # Silently fail - don't let analytics errors break the response
                logger.debug(f"Failed to track API call: {e}")
        
        return response