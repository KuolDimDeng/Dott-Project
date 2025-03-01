from django.db.models.signals import post_save
from django.dispatch import receiver
from custom_auth.models import User
from .models import UserProfile

from django.db import transaction
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    try:
        with transaction.atomic():
            if created:
                logger.info(f"Creating profile for new user: {instance.email}")
                UserProfile.objects.using('default').create(
                    user=instance,
                    is_business_owner=True  # Set as business owner for new users
                )
                logger.info(f"Successfully created profile for user: {instance.email}")
            else:
                logger.debug(f"Updating profile for user: {instance.email}")
                try:
                    profile = UserProfile.objects.using('default').get(user=instance)
                    profile.save(using='default')
                    logger.debug(f"Successfully updated profile for user: {instance.email}")
                except UserProfile.DoesNotExist:
                    # Create profile if it doesn't exist
                    UserProfile.objects.using('default').create(
                        user=instance,
                        is_business_owner=True
                    )
                    logger.info(f"Created missing profile for existing user: {instance.email}")
    except Exception as e:
        logger.error(f"Error in create_or_update_user_profile for user {instance.email}: {str(e)}",
                    exc_info=True)
        raise