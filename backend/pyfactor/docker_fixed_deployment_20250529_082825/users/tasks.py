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
    from custom_auth.cognito import update_user_attributes
    
    logger.info("Starting expired subscription check task")
    
    # Get all active subscriptions with end_date in the past
    expired_subscriptions = Subscription.objects.filter(
        is_active=True,
        end_date__lt=timezone.now().date()
    )
    
    logger.info(f"Found {expired_subscriptions.count()} expired subscriptions")
    
    for subscription in expired_subscriptions:
        try:
            # Mark subscription as inactive
            subscription.is_active = False
            subscription.save()
            
            logger.info(f"Marked subscription {subscription.id} as inactive for business {subscription.business.id}")
            
            # Find the business owner and update their Cognito attributes
            owner_profiles = UserProfile.objects.filter(
                business=subscription.business,
                is_business_owner=True
            )
            
            for profile in owner_profiles:
                if profile.user:
                    try:
                        # Update Cognito attribute to free plan
                        update_user_attributes(profile.user.username, {
                            'custom:subplan': 'free'
                        })
                        logger.info(f"Updated Cognito attributes for user {profile.user.username}")
                    except Exception as e:
                        logger.error(f"Error updating Cognito attributes for user {profile.user.username}: {str(e)}")
        
        except Exception as e:
            logger.error(f"Error processing expired subscription {subscription.id}: {str(e)}")
    
    logger.info("Completed expired subscription check task")
    return f"Processed {expired_subscriptions.count()} expired subscriptions"