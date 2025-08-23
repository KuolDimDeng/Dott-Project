"""
Signal handlers to prevent the session-UserProfile tenant mismatch edge case
"""

import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from users.models import UserProfile
from custom_auth.models import Tenant
from session_manager.models import UserSession
from django.core.cache import cache
import json

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_save, sender=UserSession)
def sync_tenant_to_profile_on_session_create(sender, instance, created, **kwargs):
    """
    When a new session is created with a tenant_id, ensure UserProfile has it too
    """
    if not created:
        return
    
    try:
        # Check if session has tenant_id in data
        if instance.session_data:
            try:
                data = json.loads(instance.session_data) if isinstance(instance.session_data, str) else instance.session_data
                session_tenant_id = data.get('tenant_id')
                
                if session_tenant_id:
                    # Get or create UserProfile
                    profile, _ = UserProfile.objects.get_or_create(user=instance.user)
                    
                    # If profile doesn't have tenant_id, sync it
                    if not profile.tenant_id:
                        # Verify tenant exists
                        if Tenant.objects.filter(id=session_tenant_id).exists():
                            profile.tenant_id = session_tenant_id
                            profile.save()
                            logger.info(f"[EdgeCasePrevention] Synced tenant {session_tenant_id} from new session to UserProfile for {instance.user.email}")
                        else:
                            logger.warning(f"[EdgeCasePrevention] Session has invalid tenant_id {session_tenant_id} for {instance.user.email}")
                    elif str(profile.tenant_id) != str(session_tenant_id):
                        logger.warning(f"[EdgeCasePrevention] Session tenant {session_tenant_id} doesn't match profile tenant {profile.tenant_id} for {instance.user.email}")
            except (json.JSONDecodeError, AttributeError) as e:
                logger.debug(f"[EdgeCasePrevention] Could not parse session data: {e}")
    except Exception as e:
        logger.error(f"[EdgeCasePrevention] Error syncing tenant to profile: {e}")


@receiver(pre_save, sender=UserProfile)
def validate_tenant_on_profile_save(sender, instance, **kwargs):
    """
    Validate tenant_id exists when saving UserProfile
    """
    if instance.tenant_id:
        # Verify tenant exists
        if not Tenant.objects.filter(id=instance.tenant_id).exists():
            logger.error(f"[EdgeCasePrevention] Attempted to save UserProfile with non-existent tenant {instance.tenant_id}")
            instance.tenant_id = None


@receiver(post_save, sender=Tenant)
def ensure_owner_has_tenant_in_profile(sender, instance, created, **kwargs):
    """
    When a tenant is created, ensure owner's UserProfile has the tenant_id
    """
    if created and instance.owner:
        try:
            profile, _ = UserProfile.objects.get_or_create(user=instance.owner)
            
            if not profile.tenant_id:
                profile.tenant_id = instance.id
                profile.save()
                logger.info(f"[EdgeCasePrevention] Set tenant {instance.id} in UserProfile for owner {instance.owner.email}")
            elif profile.tenant_id != instance.id:
                logger.warning(f"[EdgeCasePrevention] User {instance.owner.email} owns multiple tenants: {profile.tenant_id} and {instance.id}")
        except Exception as e:
            logger.error(f"[EdgeCasePrevention] Error ensuring owner has tenant in profile: {e}")


def check_and_fix_user_tenant_consistency(user):
    """
    Helper function to check and fix tenant consistency for a user
    Called from various places to ensure consistency
    """
    try:
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        # Check if user owns a tenant but profile doesn't have it
        if not profile.tenant_id:
            owned_tenant = Tenant.objects.filter(owner=user).first()
            if owned_tenant:
                profile.tenant_id = owned_tenant.id
                profile.save()
                logger.info(f"[EdgeCasePrevention] Fixed: Set tenant {owned_tenant.id} in profile for {user.email}")
                return True
        
        # Check if profile has a tenant that doesn't exist
        elif profile.tenant_id:
            if not Tenant.objects.filter(id=profile.tenant_id).exists():
                logger.error(f"[EdgeCasePrevention] Profile has non-existent tenant {profile.tenant_id} for {user.email}")
                profile.tenant_id = None
                profile.save()
                return False
        
        return True
    except Exception as e:
        logger.error(f"[EdgeCasePrevention] Error checking tenant consistency: {e}")
        return False