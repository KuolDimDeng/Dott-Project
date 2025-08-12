"""
Signals for the users app
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import BusinessDetails
from .accounting_standards import get_default_accounting_standard

logger = logging.getLogger(__name__)

@receiver(post_save, sender=BusinessDetails)
def set_default_accounting_standard(sender, instance, created, **kwargs):
    """
    Set default accounting standard based on country when BusinessDetails is created
    """
    if created and not instance.accounting_standard:
        country_code = str(instance.country) if instance.country else 'US'
        default_standard = get_default_accounting_standard(country_code)
        
        # Set the default accounting standard
        instance.accounting_standard = default_standard
        
        # Set default inventory method
        if not instance.inventory_valuation_method:
            instance.inventory_valuation_method = 'WEIGHTED_AVERAGE'
        
        # Save without triggering the signal again
        BusinessDetails.objects.filter(business=instance.business).update(
            accounting_standard=default_standard,
            inventory_valuation_method=instance.inventory_valuation_method
        )
        
        logger.info(f"Set default accounting standard {default_standard} for business {instance.business.id} in country {country_code}")