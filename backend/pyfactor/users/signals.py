"""
User-related signals for automatic tax cache updates
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

from users.models import Business, UserProfile
from taxes.services.tax_cache_service import TaxRateCacheService

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Business)
def update_tax_cache_on_business_change(sender, instance, created, **kwargs):
    """
    Update cached tax rates when business location changes
    """
    if not created:
        # Check if location fields changed
        update_fields = kwargs.get('update_fields', set())
        location_fields = {'country', 'state', 'county', 'city'}
        
        # If update_fields is None, all fields were updated
        # If it's a set, check if any location fields were updated
        if update_fields is None or location_fields.intersection(update_fields):
            logger.info(f"[TaxCache] Business location changed for {instance.name}, updating tax cache")
            
            # Invalidate cache for all users in this tenant
            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                
                # Find all users associated with this business
                users = User.objects.filter(tenant_id=instance.tenant_id, is_active=True)
                
                updated_count = 0
                for user in users:
                    result = TaxRateCacheService.update_user_cached_tax_rate(user)
                    if result.get("success"):
                        updated_count += 1
                        logger.info(f"[TaxCache] Updated cache for user {user.email}: {result.get('rate_percentage')}%")
                
                logger.info(f"[TaxCache] Updated tax cache for {updated_count} users after business location change")
                
            except Exception as e:
                logger.error(f"[TaxCache] Error updating cache after business change: {e}")


@receiver(post_save, sender=UserProfile)
def populate_tax_cache_on_profile_creation(sender, instance, created, **kwargs):
    """
    Populate tax cache when user profile is created
    """
    if created:
        try:
            logger.info(f"[TaxCache] New profile created for user {instance.user.email}, populating tax cache")
            result = TaxRateCacheService.update_user_cached_tax_rate(instance.user)
            
            if result.get("success"):
                rate = result.get("rate_percentage", 0)
                jurisdiction = result.get("jurisdiction", "Unknown")
                logger.info(f"[TaxCache] Initial cache set: {rate}% for {jurisdiction}")
            else:
                logger.warning(f"[TaxCache] Could not set initial cache: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"[TaxCache] Error setting initial cache: {e}")


def invalidate_tenant_tax_cache(tenant_id):
    """
    Helper function to invalidate all tax caches for a tenant
    Call this when tenant-wide tax settings change
    """
    try:
        count = TaxRateCacheService.invalidate_cache_for_tenant(tenant_id)
        logger.info(f"[TaxCache] Invalidated {count} user caches for tenant {tenant_id}")
        return count
    except Exception as e:
        logger.error(f"[TaxCache] Error invalidating tenant cache: {e}")
        return 0