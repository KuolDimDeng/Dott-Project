"""
Signals for finance app
Automatically initialize Chart of Accounts when tenant is created
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from custom_auth.models import User, Tenant
from users.models import Business
from .chart_of_accounts_init import initialize_chart_of_accounts
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def initialize_chart_for_new_user(sender, instance, created, **kwargs):
    """
    Initialize Chart of Accounts when a new user is created with a tenant
    """
    if created and instance.tenant_id:
        try:
            # Get business if exists
            business = None
            try:
                business = Business.objects.filter(tenant_id=instance.tenant_id).first()
            except:
                pass
            
            result = initialize_chart_of_accounts(instance.tenant_id, business)
            logger.info(f"Chart of Accounts initialized for new user {instance.email}: {result}")
        except Exception as e:
            logger.error(f"Failed to initialize Chart of Accounts for user {instance.email}: {str(e)}")


@receiver(post_save, sender=Business)
def initialize_chart_for_new_business(sender, instance, created, **kwargs):
    """
    Initialize Chart of Accounts when a new business is created
    """
    if created and instance.tenant_id:
        try:
            result = initialize_chart_of_accounts(instance.tenant_id, instance)
            logger.info(f"Chart of Accounts initialized for new business {instance.name}: {result}")
        except Exception as e:
            logger.error(f"Failed to initialize Chart of Accounts for business {instance.name}: {str(e)}")


@receiver(post_save, sender=Tenant)
def initialize_chart_for_new_tenant(sender, instance, created, **kwargs):
    """
    Initialize Chart of Accounts when a new tenant is created
    """
    if created:
        try:
            # Get business if exists
            business = None
            try:
                business = Business.objects.filter(tenant_id=instance.id).first()
            except:
                pass
            
            result = initialize_chart_of_accounts(instance.id, business)
            logger.info(f"Chart of Accounts initialized for new tenant {instance.id}: {result}")
        except Exception as e:
            logger.error(f"Failed to initialize Chart of Accounts for tenant {instance.id}: {str(e)}")