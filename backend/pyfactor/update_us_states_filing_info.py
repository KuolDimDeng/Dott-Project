import os
import sys
import django
from decimal import Decimal
from django.db import transaction as db_transaction
import logging

# Set up Django environment
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def update_us_states():
    """Update all US state records with filing information."""
    
    # Get all US records
    us_records = GlobalSalesTaxRate.objects.filter(country='US', is_current=True)
    logger.info(f"Found {us_records.count()} US records to update")
    
    success_count = 0
    error_count = 0
    
    # Common filing info for all US states
    filing_info = {
        'tax_authority_name': 'State Revenue Department',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 20,
        'filing_deadline_days': 20,
        'filing_deadline_description': 'Varies by state - typically 20th',
        'grace_period_days': 0,
        'penalty_rate': Decimal('1.0'),
        'deadline_notes': 'State-specific filing requirements',
        'online_filing_available': True,
        'online_portal_name': 'State e-File System',
        'online_portal_url': 'https://www.taxadmin.org',
        'main_form_name': 'State Sales Tax Return',
        'filing_instructions': 'File monthly state sales tax returns by state deadline.',
        'manual_filing_fee': Decimal('40.00'),
        'online_filing_fee': Decimal('55.00')
    }
    
    # Update each record
    for record in us_records:
        try:
            with db_transaction.atomic():
                # Update with state-specific info where available
                state_name = record.region_name if record.region_name else 'Federal'
                
                # Customize certain fields based on state
                record.tax_authority_name = f"{state_name} Department of Revenue"
                record.filing_frequency = filing_info['filing_frequency']
                record.filing_day_of_month = filing_info['filing_day_of_month']
                record.filing_deadline_days = filing_info['filing_deadline_days']
                record.filing_deadline_description = filing_info['filing_deadline_description']
                record.grace_period_days = filing_info['grace_period_days']
                record.penalty_rate = filing_info['penalty_rate']
                record.deadline_notes = filing_info['deadline_notes']
                record.online_filing_available = filing_info['online_filing_available']
                record.online_portal_name = f"{state_name} e-File"
                record.online_portal_url = filing_info['online_portal_url']
                record.main_form_name = filing_info['main_form_name']
                record.filing_instructions = f"File monthly {state_name} sales tax returns by deadline."
                record.manual_filing_fee = filing_info['manual_filing_fee']
                record.online_filing_fee = filing_info['online_filing_fee']
                
                record.save()
                success_count += 1
                logger.info(f"✅ Updated {state_name} - {record.country_name}")
                
        except Exception as e:
            error_count += 1
            logger.error(f"❌ Error updating {record.region_name or 'Federal'}: {e}")
    
    # Summary
    logger.info(f"\n{'='*60}")
    logger.info(f"US States Update Complete")
    logger.info(f"Successfully updated: {success_count} records")
    logger.info(f"Errors: {error_count}")
    logger.info(f"{'='*60}")
    
    # Check total progress
    total_with_filing = GlobalSalesTaxRate.objects.filter(
        is_current=True,
        tax_authority_name__isnull=False
    ).values('country').distinct().count()
    
    remaining = GlobalSalesTaxRate.objects.filter(
        is_current=True,
        tax_authority_name__isnull=True
    ).values('country').distinct().count()
    
    logger.info(f"\nOverall Progress:")
    logger.info(f"Countries with filing info: {total_with_filing}/300")
    logger.info(f"Countries remaining: {remaining}")

if __name__ == "__main__":
    logger.info("Starting to update US states filing information...")
    update_us_states()