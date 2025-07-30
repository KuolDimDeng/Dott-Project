# Data migration to populate currency for existing invoices/estimates

from django.db import migrations
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


def populate_currency_from_business(apps, schema_editor):
    """
    Populate currency for existing invoices and estimates from business preferences
    """
    Invoice = apps.get_model('sales', 'Invoice')
    Estimate = apps.get_model('sales', 'Estimate')
    BusinessDetails = apps.get_model('users', 'BusinessDetails')
    
    # Process invoices
    updated_invoices = 0
    for invoice in Invoice.objects.filter(currency='USD'):
        try:
            # Get business details for the invoice's tenant
            business_details = BusinessDetails.objects.filter(
                business__id=invoice.tenant_id
            ).first()
            
            if business_details and business_details.preferred_currency_code != 'USD':
                invoice.currency = business_details.preferred_currency_code
                # Mark as migrated data (no exchange rate available for historical data)
                invoice.exchange_rate = None
                invoice.exchange_rate_date = None
                # Don't lock historical invoices unless they're already paid
                if invoice.is_paid or invoice.status == 'paid':
                    invoice.currency_locked = True
                invoice.save()
                updated_invoices += 1
                logger.info(f"[CURRENCY-MIGRATION] Updated invoice {invoice.invoice_num} to {business_details.preferred_currency_code}")
        except Exception as e:
            logger.error(f"[CURRENCY-MIGRATION] Error updating invoice {invoice.id}: {str(e)}")
    
    # Process estimates
    updated_estimates = 0
    for estimate in Estimate.objects.filter(currency='USD'):
        try:
            # Get business details for the estimate's tenant
            business_details = BusinessDetails.objects.filter(
                business__id=estimate.tenant_id
            ).first()
            
            if business_details and business_details.preferred_currency_code != 'USD':
                estimate.currency = business_details.preferred_currency_code
                # Mark as migrated data
                estimate.exchange_rate = None
                estimate.exchange_rate_date = None
                estimate.save()
                updated_estimates += 1
                logger.info(f"[CURRENCY-MIGRATION] Updated estimate {estimate.estimate_num} to {business_details.preferred_currency_code}")
        except Exception as e:
            logger.error(f"[CURRENCY-MIGRATION] Error updating estimate {estimate.id}: {str(e)}")
    
    logger.info(f"[CURRENCY-MIGRATION] Migration complete. Updated {updated_invoices} invoices and {updated_estimates} estimates")


def reverse_migration(apps, schema_editor):
    """
    Reverse migration - set all currencies back to USD
    """
    Invoice = apps.get_model('sales', 'Invoice')
    Estimate = apps.get_model('sales', 'Estimate')
    
    Invoice.objects.update(
        currency='USD',
        exchange_rate=None,
        exchange_rate_date=None,
        currency_locked=False
    )
    
    Estimate.objects.update(
        currency='USD',
        exchange_rate=None,
        exchange_rate_date=None,
        currency_locked=False
    )


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0003_add_currency_exchange_fields'),
        ('users', '0001_initial'),  # Ensure BusinessDetails model is available
    ]

    operations = [
        migrations.RunPython(
            populate_currency_from_business,
            reverse_migration
        ),
    ]