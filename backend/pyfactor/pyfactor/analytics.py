try:
    import posthog
    POSTHOG_AVAILABLE = True
except ImportError:
    POSTHOG_AVAILABLE = False
    posthog = None

from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Initialize PostHog
def init_posthog():
    """Initialize PostHog with API key from settings"""
    if not POSTHOG_AVAILABLE:
        logger.warning("PostHog package not available. Analytics will be disabled.")
        return
        
    if hasattr(settings, 'POSTHOG_API_KEY') and settings.POSTHOG_API_KEY:
        posthog.project_api_key = settings.POSTHOG_API_KEY
        posthog.host = getattr(settings, 'POSTHOG_HOST', 'https://app.posthog.com')
        logger.info("PostHog initialized successfully")
    else:
        logger.warning("PostHog API key not found. Analytics will be disabled.")

def track_event(user_id, event_name, properties=None):
    """Track an event in PostHog"""
    if not POSTHOG_AVAILABLE or not hasattr(settings, 'POSTHOG_API_KEY') or not settings.POSTHOG_API_KEY:
        return
    
    # Check if PostHog has been initialized with API key
    if not hasattr(posthog, 'project_api_key') or not posthog.project_api_key:
        return
    
    try:
        posthog.capture(
            distinct_id=str(user_id),
            event=event_name,
            properties=properties or {}
        )
    except Exception as e:
        logger.error(f"Error tracking PostHog event {event_name}: {str(e)}")

def identify_user(user):
    """Identify a user in PostHog"""
    if not POSTHOG_AVAILABLE or not hasattr(settings, 'POSTHOG_API_KEY') or not settings.POSTHOG_API_KEY:
        return
    
    # Check if PostHog has been initialized with API key
    if not hasattr(posthog, 'project_api_key') or not posthog.project_api_key:
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
        logger.error(f"Error identifying user in PostHog: {str(e)}")

def track_api_call(user_id, endpoint, method, status_code, duration_ms=None):
    """Track API call metrics"""
    if not POSTHOG_AVAILABLE or not hasattr(settings, 'POSTHOG_API_KEY') or not settings.POSTHOG_API_KEY:
        return
    
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
    if not POSTHOG_AVAILABLE or not hasattr(settings, 'POSTHOG_API_KEY') or not settings.POSTHOG_API_KEY:
        return
    
    properties = {
        'metric_value': value,
    }
    
    if metadata:
        properties.update(metadata)
    
    track_event(user_id, f'business_metric_{metric_name}', properties)