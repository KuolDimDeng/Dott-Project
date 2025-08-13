"""
Signals for the users app
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import BusinessDetails, Business, UserProfile
from .accounting_standards import get_default_accounting_standard
from finance.chart_of_accounts_init import initialize_chart_of_accounts

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


@receiver(post_save, sender=Business)
def initialize_business_chart_of_accounts(sender, instance, created, **kwargs):
    """
    Initialize Chart of Accounts immediately when a business is created.
    This follows industry standards - financial accounts should exist from day 1.
    """
    if created and instance.tenant_id:
        try:
            # Initialize Chart of Accounts based on business type
            result = initialize_chart_of_accounts(
                tenant_id=instance.tenant_id,
                business=instance
            )
            logger.info(
                f"Chart of Accounts initialized for new business {instance.name}: "
                f"{result.get('created', 0)} accounts created"
            )
        except Exception as e:
            logger.error(
                f"Failed to initialize Chart of Accounts for business {instance.name}: {str(e)}"
            )
            # Don't fail business creation if CoA initialization fails