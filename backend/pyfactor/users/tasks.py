from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@shared_task
def check_expired_subscriptions():
    """
    Task to check for expired subscriptions and update their status.
    This should be scheduled to run daily.
    """
    from users.models import Subscription, UserProfile
    
    logger.info("Starting expired subscription check task")
    
    """Check and handle expired subscriptions using Auth0"""
    try:
        # Get expired subscriptions
        expired_subscriptions = Subscription.objects.filter(
            end_date__lt=timezone.now().date(),
            is_active=True
        )
        
        for subscription in expired_subscriptions:
            # Deactivate subscription
            subscription.is_active = False
            subscription.save()
            
            # Log the expiration since using Auth0 instead of Cognito
            logger.info(f"Expired subscription {subscription.id} for business {subscription.business.name}")
        
        logger.info(f"Processed {expired_subscriptions.count()} expired subscriptions")
        
    except Exception as e:
        logger.error(f"Error checking expired subscriptions: {str(e)}")
        raise
    
    logger.info("Completed expired subscription check task")
    return f"Processed {expired_subscriptions.count()} expired subscriptions"