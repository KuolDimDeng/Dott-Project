"""
Sync currency preferences between BusinessDetails and BusinessSettings
"""
import logging
from users.models import BusinessSettings

logger = logging.getLogger(__name__)

def sync_currency_to_business_settings(business_details, tenant_id):
    """
    Sync currency from BusinessDetails to BusinessSettings
    This ensures POS and other features use the correct currency
    """
    try:
        # Get or create BusinessSettings
        business_settings, created = BusinessSettings.objects.get_or_create(
            tenant_id=tenant_id,
            defaults={
                'preferred_currency_code': business_details.preferred_currency_code or 'USD',
                'preferred_currency_symbol': get_currency_symbol(business_details.preferred_currency_code),
                'business_name': business_details.business.name if hasattr(business_details, 'business') else 'Business',
                'business_type': 'RETAIL',
                'country': get_country_from_currency(business_details.preferred_currency_code),
            }
        )
        
        if not created:
            # Update existing BusinessSettings
            business_settings.preferred_currency_code = business_details.preferred_currency_code
            business_settings.preferred_currency_symbol = get_currency_symbol(business_details.preferred_currency_code)
            business_settings.save()
            logger.info(f"Updated BusinessSettings currency to {business_details.preferred_currency_code}")
        else:
            logger.info(f"Created BusinessSettings with currency {business_details.preferred_currency_code}")
            
        return business_settings
        
    except Exception as e:
        logger.error(f"Failed to sync currency to BusinessSettings: {e}")
        return None

def get_currency_symbol(currency_code):
    """Get currency symbol from code"""
    currency_symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'SSP': 'SSP',
        'KES': 'KSh',
        'UGX': 'USh',
        'TZS': 'TSh',
        'RWF': 'FRw',
        'ETB': 'Br',
        'NGN': '₦',
        'ZAR': 'R',
        'GHS': 'GH₵',
        'EGP': 'E£',
        'MAD': 'DH',
        'XOF': 'CFA',
        'XAF': 'FCFA',
    }
    return currency_symbols.get(currency_code, currency_code)

def get_country_from_currency(currency_code):
    """Get country code from currency"""
    currency_countries = {
        'USD': 'US',
        'EUR': 'EU',
        'GBP': 'GB',
        'SSP': 'SS',  # South Sudan
        'KES': 'KE',  # Kenya
        'UGX': 'UG',  # Uganda
        'TZS': 'TZ',  # Tanzania
        'RWF': 'RW',  # Rwanda
        'ETB': 'ET',  # Ethiopia
        'NGN': 'NG',  # Nigeria
        'ZAR': 'ZA',  # South Africa
        'GHS': 'GH',  # Ghana
        'EGP': 'EG',  # Egypt
        'MAD': 'MA',  # Morocco
    }
    return currency_countries.get(currency_code, 'US')