try:
    import posthog
    POSTHOG_AVAILABLE = True
except ImportError:
    POSTHOG_AVAILABLE = False
    posthog = None

from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Global flag to track if PostHog is properly initialized
_posthog_initialized = False

# Initialize PostHog
def init_posthog():
    """Initialize PostHog with API key from settings"""
    global _posthog_initialized
    
    if not POSTHOG_AVAILABLE:
        logger.warning("PostHog package not available. Analytics will be disabled.")
        _posthog_initialized = False
        return
        
    posthog_key = getattr(settings, 'POSTHOG_API_KEY', None)
    if posthog_key and posthog_key.strip():  # Check for non-empty string
        try:
            posthog.project_api_key = posthog_key
            posthog.host = getattr(settings, 'POSTHOG_HOST', 'https://app.posthog.com')
            # Test if PostHog is properly initialized by checking the API key
            if posthog.project_api_key:
                _posthog_initialized = True
                logger.info("PostHog initialized successfully")
            else:
                _posthog_initialized = False
                logger.warning("PostHog initialization failed - API key not set")
        except Exception as e:
            _posthog_initialized = False
            logger.error(f"Failed to initialize PostHog: {e}")
    else:
        _posthog_initialized = False
        logger.info("PostHog API key not configured. Analytics disabled.")

def track_event(user_id, event_name, properties=None):
    """Track an event in PostHog"""
    global _posthog_initialized
    
    # Early return if PostHog is not initialized
    if not _posthog_initialized:
        return
    
    try:
        posthog.capture(
            distinct_id=str(user_id),
            event=event_name,
            properties=properties or {}
        )
    except Exception as e:
        # If we get an API key error, disable PostHog for this session
        if "API key" in str(e):
            _posthog_initialized = False
            logger.warning(f"PostHog API key error detected. Disabling analytics for this session.")
        else:
            logger.error(f"Error tracking PostHog event {event_name}: {str(e)}")

def identify_user(user):
    """Identify a user in PostHog"""
    global _posthog_initialized
    
    # Early return if PostHog is not initialized
    if not _posthog_initialized:
        return
    
    try:
        properties = {
            'email': user.email,
            'name': getattr(user, 'name', f"{user.first_name} {user.last_name}".strip()),
            'tenant_id': getattr(user, 'tenant_id', None),
            'role': getattr(user, 'role', None),
            'created_at': user.date_joined.isoformat() if hasattr(user, 'date_joined') else None,
        }
        
        # Remove None values
        properties = {k: v for k, v in properties.items() if v is not None}
        
        posthog.identify(
            distinct_id=str(user.id),
            properties=properties
        )
    except Exception as e:
        # If we get an API key error, disable PostHog for this session
        if "API key" in str(e):
            _posthog_initialized = False
            logger.warning(f"PostHog API key error detected. Disabling analytics for this session.")
        else:
            logger.error(f"Error identifying user in PostHog: {str(e)}")

def track_api_call(user_id, endpoint, method, status_code, duration_ms=None):
    """Track API call metrics"""
    # track_event already handles the initialization check
    properties = {
        'endpoint': endpoint,
        'method': method,
        'status_code': status_code,
    }
    
    if duration_ms:
        properties['duration_ms'] = duration_ms
    
    track_event(user_id, 'api_call', properties)

def track_business_metric(user_id, metric_name, value, metadata=None):
    """Track business metrics like revenue, customer count, etc."""
    # track_event already handles the initialization check
    properties = {
        'metric_value': value,
    }
    
    if metadata:
        properties.update(metadata)
    
    track_event(user_id, f'business_metric_{metric_name}', properties)