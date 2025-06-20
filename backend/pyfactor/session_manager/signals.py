"""
Session Manager Signals

This module contains signal handlers for the session_manager app.
Main purpose: Sync session onboarding status with OnboardingProgress table.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
import logging

from .models import Session
from onboarding.models import OnboardingProgress

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Session)
def sync_session_onboarding_status(sender, instance, created, **kwargs):
    """
    When a new session is created, sync its onboarding status with
    the user's OnboardingProgress record.
    
    This fixes the issue where new sessions always default to needs_onboarding=True
    even for users who have already completed onboarding.
    """
    if created:  # Only for newly created sessions
        try:
            # Use select_for_update to avoid race conditions
            with transaction.atomic():
                progress = OnboardingProgress.objects.select_for_update().get(user=instance.user)
                
                # Determine the correct onboarding status
                needs_onboarding = progress.status != 'complete'
                onboarding_completed = progress.status == 'complete'
                onboarding_step = progress.current_step if progress.current_step else 'business_info'
                
                # Only update if values are different from defaults
                if (instance.needs_onboarding != needs_onboarding or 
                    instance.onboarding_completed != onboarding_completed or
                    instance.onboarding_step != onboarding_step):
                    
                    # Update without triggering the signal again
                    Session.objects.filter(pk=instance.pk).update(
                        needs_onboarding=needs_onboarding,
                        onboarding_completed=onboarding_completed,
                        onboarding_step=onboarding_step
                    )
                    
                    logger.info(
                        f"Synced session {instance.session_token[:8]}... with OnboardingProgress. "
                        f"User: {instance.user.email}, Status: {progress.status}, "
                        f"Needs Onboarding: {needs_onboarding}"
                    )
                
        except OnboardingProgress.DoesNotExist:
            # User hasn't started onboarding yet - keep defaults
            logger.debug(f"No OnboardingProgress for user {instance.user.email} - using defaults")
        except Exception as e:
            # Don't let signal errors break session creation
            logger.error(f"Error syncing session onboarding status: {e}")


@receiver(post_save, sender=Session)
def update_session_activity(sender, instance, created, **kwargs):
    """
    Update last_activity timestamp when session is saved.
    This is handled by auto_now on the model field, but this signal
    could be used for additional activity tracking if needed.
    """
    if not created:
        # Session was updated (not created)
        # Could log activity, send metrics, etc.
        pass