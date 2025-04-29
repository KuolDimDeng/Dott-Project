from django.conf import settings
from django.db.models import Sum
import logging

logger = logging.getLogger(__name__)

def get_reconciliation_summary(account, end_date):
    from .models import BankTransaction
    
    outstanding_checks = BankTransaction.objects.filter(
        account=account,
        transaction_type='DEBIT',
        is_reconciled=False,
        date__lte=end_date
    ).aggregate(Sum('amount'))['amount__sum'] or 0

    deposits_in_transit = BankTransaction.objects.filter(
        account=account,
        transaction_type='CREDIT',
        is_reconciled=False,
        date__lte=end_date
    ).aggregate(Sum('amount'))['amount__sum'] or 0

    return {
        'outstanding_checks': float(outstanding_checks),
        'deposits_in_transit': float(deposits_in_transit)
    }

def validate_bank_credentials(username, password):
    # This is a placeholder for actual validation logic
    # In a real implementation, this would check with the bank's API
    if username and password and len(username) > 3 and len(password) > 3:
        return True
    return False

def format_account_number(account_number):
    """Format account number for display by masking all but the last 4 digits"""
    if not account_number:
        return ""
    if len(account_number) <= 4:
        return "****" + account_number
    return "****" + account_number[-4:]

def get_payment_gateway_for_country(country_code, fallback='WISE'):
    """
    Determine the appropriate payment gateway based on the country code.
    
    Args:
        country_code (str): ISO 2-letter country code (e.g., 'US', 'GB')
        fallback (str): Fallback gateway to use if no matching country is found (default: 'WISE')
        
    Returns:
        dict: Dictionary containing available payment gateways for the country, with keys:
              - 'primary': Primary payment gateway
              - 'secondary': Secondary payment gateway (if available)
              - 'tertiary': Tertiary payment gateway (if available)
              - 'quaternary': Quaternary payment gateway (if available)
        
    If the country isn't found in our database, defaults to the fallback gateway as primary.
    """
    try:
        from .models import Country, CountryPaymentGateway
        
        # Convert to uppercase to ensure consistent lookups
        country_code = country_code.upper() if country_code else None
        
        if not country_code:
            logger.warning("No country code provided, defaulting to fallback gateway")
            return {'primary': fallback}
        
        # Get the country
        country = Country.objects.filter(code=country_code).first()
        
        if not country:
            logger.warning(f"No country found for code: {country_code}, defaulting to fallback gateway")
            return {'primary': fallback}
        
        # Get all payment gateways for this country, ordered by priority
        country_gateways = CountryPaymentGateway.objects.filter(
            country=country
        ).order_by('priority')
        
        if not country_gateways:
            logger.warning(f"No payment gateways found for country: {country.name}, defaulting to fallback gateway")
            return {'primary': fallback}
        
        # Build dictionary of gateways by priority
        gateways = {}
        priority_map = {1: 'primary', 2: 'secondary', 3: 'tertiary', 4: 'quaternary'}
        
        for cpg in country_gateways:
            priority_name = priority_map.get(cpg.priority)
            if priority_name:
                gateways[priority_name] = cpg.gateway.name
        
        # Ensure at least primary is set
        if 'primary' not in gateways:
            gateways['primary'] = fallback
            
        return gateways
    except Exception as e:
        logger.error(f"Error determining payment gateway for country {country_code}: {str(e)}")
        return {'primary': fallback}  # Default to fallback in case of errors