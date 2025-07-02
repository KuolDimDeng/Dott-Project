# onboarding/celery_base.py
# Celery has been removed from this project
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

def send_websocket_notification(user_id, event_type, data):
    """
    Basic notification function that doesn't require any Django models.
    This forms the foundation for all websocket communications.
    Note: Celery has been removed - this is now a regular function.
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.error("Channel layer unavailable")
            return False

        group_name = f"user_{user_id}"
        message_data = {
            **data,
            'timestamp': timezone.now().isoformat()
        }

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": event_type,
                "data": message_data
            }
        )
        return True
    except Exception as e:
        logger.error(f"Notification failed: {str(e)}")
        return False