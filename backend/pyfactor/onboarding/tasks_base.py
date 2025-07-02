# onboarding/tasks_base.py
# Celery has been removed from this project
from django.utils import timezone
import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

def send_notification_task(user_id, message_type, data):
    """
    Base notification function that handles WebSocket communication without model dependencies.
    This function serves as a foundation for all notification-related operations.
    Note: Celery has been removed - this is now a regular function.
    
    Args:
        user_id: The ID of the user to notify
        message_type: The type of message being sent
        data: The message payload
        
    Returns:
        bool: True if notification was sent successfully, False otherwise
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.error("Channel layer not available - check CHANNEL_LAYERS setting")
            return False

        group_name = f"user_{user_id}"
        
        # Add timestamp for message ordering
        message_data = {
            **data,
            'timestamp': timezone.now().isoformat()
        }
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": message_type,
                "data": message_data
            }
        )
        logger.debug(f"Successfully sent {message_type} notification to {group_name}")
        return True
        
    except Exception as e:
        logger.error(f"Notification failed: {str(e)}", exc_info=True)
        return False