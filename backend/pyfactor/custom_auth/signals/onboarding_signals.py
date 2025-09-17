"""
Signals to ensure proper onboarding flow and prevent edge cases
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from users.models import UserProfile
from onboarding.models import OnboardingProgress
from custom_auth.models import Tenant
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()

@receiver(post_save, sender=User)
def ensure_onboarding_consistency(sender, instance, created, **kwargs):
    """
    Ensure onboarding data is consistent when user is saved
    This prevents the edge case where users get stuck
    """
    
    if created:
        # New user - ensure UserProfile exists with user_mode
        UserProfile.objects.get_or_create(
            user=instance,
            defaults={
                'user_mode': 'consumer',  # Default to consumer mode for new users
                'default_mode': 'consumer',
                'has_consumer_access': True,
                'has_business_access': False
            }
        )
        
        # Ensure OnboardingProgress exists
        OnboardingProgress.objects.get_or_create(
            user=instance,
            defaults={
                'onboarding_status': 'not_started',
                'current_step': 'business_info',
                'completed_steps': []
            }
        )
        logger.info(f"Created onboarding records for new user: {instance.email}")
    
    else:
        # Existing user - check for consistency
        try:
            profile = UserProfile.objects.get(user=instance)
            
            # If user has tenant/business but onboarding not complete, fix it
            if (profile.tenant_id or profile.business_id) and not instance.onboarding_completed:
                logger.warning(f"Fixing inconsistent onboarding state for {instance.email}")
                
                # Check if they have completed onboarding progress
                try:
                    progress = OnboardingProgress.objects.get(user=instance)
                    if progress.onboarding_status == 'complete' or progress.setup_completed:
                        # They actually completed onboarding, just the flag is wrong
                        instance.onboarding_completed = True
                        instance.onboarding_completed_at = timezone.now()
                        instance.save(update_fields=['onboarding_completed', 'onboarding_completed_at'])
                        logger.info(f"Auto-fixed onboarding_completed for {instance.email}")
                except OnboardingProgress.DoesNotExist:
                    # Create completed progress if they have tenant/business
                    if profile.tenant_id and profile.business_id:
                        OnboardingProgress.objects.create(
                            user=instance,
                            onboarding_status='complete',
                            setup_completed=True,
                            current_step='completed',
                            completed_steps=['business_info', 'subscription', 'payment', 'setup'],
                            payment_completed=True,
                            completed_at=timezone.now()
                        )
                        instance.onboarding_completed = True
                        instance.onboarding_completed_at = timezone.now()
                        instance.save(update_fields=['onboarding_completed', 'onboarding_completed_at'])
                        logger.info(f"Auto-completed onboarding for {instance.email} with existing tenant/business")
                        
        except UserProfile.DoesNotExist:
            # Create profile if missing with user_mode
            UserProfile.objects.create(
                user=instance,
                user_mode='consumer',  # Default to consumer mode
                default_mode='consumer',
                has_consumer_access=True,
                has_business_access=False
            )
            logger.info(f"Created missing UserProfile for {instance.email}")

@receiver(post_save, sender=OnboardingProgress)
def sync_onboarding_completion(sender, instance, **kwargs):
    """
    When OnboardingProgress is marked complete, ensure User model is updated
    """
    
    if instance.onboarding_status == 'complete' and not instance.user.onboarding_completed:
        instance.user.onboarding_completed = True
        instance.user.onboarding_completed_at = timezone.now()
        instance.user.save(update_fields=['onboarding_completed', 'onboarding_completed_at'])
        logger.info(f"Synced onboarding_completed to User model for {instance.user.email}")

@receiver(post_save, sender=Tenant)
def check_onboarding_on_tenant_creation(sender, instance, created, **kwargs):
    """
    When a tenant is created, check if user should be marked as onboarded
    """
    
    if created and instance.owner_id:
        # Get the user by owner_id
        user = User.objects.filter(id=instance.owner_id).first()
        if not user:
            logger.warning(f"Tenant {instance.id} has owner_id {instance.owner_id} but user not found")
            return
            
        profile = UserProfile.objects.filter(user=user).first()
        
        if profile:
            # Update profile with tenant ID if not set
            if not profile.tenant_id:
                profile.tenant_id = instance.id
                profile.save()
                logger.info(f"Updated UserProfile with tenant_id for {user.email}")
            
            # If they have a business too, they might be done with onboarding
            if profile.business_id and not user.onboarding_completed:
                # Check OnboardingProgress
                progress = OnboardingProgress.objects.filter(user=user).first()
                if progress and len(progress.completed_steps) >= 2:  # At least business_info and subscription
                    user.onboarding_completed = True
                    user.onboarding_completed_at = timezone.now()
                    user.save(update_fields=['onboarding_completed', 'onboarding_completed_at'])
                    
                    progress.onboarding_status = 'complete'
                    progress.setup_completed = True
                    progress.save()
                    
                    logger.info(f"Auto-completed onboarding for {user.email} after tenant creation")