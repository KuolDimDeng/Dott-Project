"""
Signal handlers for the custom_auth app.
This file contains Django signal handlers to perform actions when certain events occur.
"""

import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.conf import settings

logger = logging.getLogger(__name__)

# Import models locally to avoid circular imports
from custom_auth.models import User, Tenant

@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for User model post_save event.
    """
    if created:
        logger.info(f"New user created: {instance.email} (ID: {instance.id})")

@receiver(post_save, sender=Tenant)
def tenant_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for Tenant model post_save event.
    """
    if created:
        logger.info(f"New tenant created: {instance.name} (ID: {instance.id})")
