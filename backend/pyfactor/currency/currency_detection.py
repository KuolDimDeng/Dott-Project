"""
Currency Detection Module
Auto-detects currency based on business country
Industry standard approach used by Stripe, PayPal, etc.
"""

import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

# Country to Currency mapping - ISO 3166-1 alpha-2 to ISO 4217
COUNTRY_TO_CURRENCY = {
    # A
    'AD': {'code': 'EUR', 'symbol': '€', 'name': 'Euro'},
    'AE': {'code': 'AED', 'symbol': 'د.إ', 'name': 'UAE Dirham'},
    'AF': {'code': 'AFN', 'symbol': '؋', 'name': 'Afghani'},
    'AG': {'code': 'XCD', 'symbol': '$', 'name': 'East Caribbean Dollar'},
    'AI': {'code': 'XCD', 'symbol': '$', 'name': 'East Caribbean Dollar'},
    'AL': {'code': 'ALL', 'symbol': 'L', 'name': 'Lek'},
    'AM': {'code': 'AMD', 'symbol': '֏', 'name': 'Armenian Dram'},
    'AO': {'code': 'AOA', 'symbol': 'Kz', 'name': 'Kwanza'},
    'AR': {'code': 'ARS', 'symbol': '$', 'name': 'Argentine Peso'},
    'AS': {'code': 'USD', 'symbol': '$', 'name': 'US Dollar'},
    'AT': {'code': 'EUR', 'symbol': '€', 'name': 'Euro'},
    'AU': {'code': 'AUD', 'symbol': '$', 'name': 'Australian Dollar'},
    'AW': {'code': 'AWG', 'symbol': 'ƒ', 'name': 'Aruban Florin'},
    'AZ': {'code': 'AZN', 'symbol': '₼', 'name': 'Azerbaijan Manat'},
    
    # B
    'BA': {'code': 'BAM', 'symbol': 'KM', 'name': 'Convertible Mark'},
    'BB': {'code': 'BBD', 'symbol': '$', 'name': 'Barbados Dollar'},
    'BD': {'code': 'BDT', 'symbol': '৳', 'name': 'Taka'},
    'BE': {'code': 'EUR', 'symbol': '€', 'name': 'Euro'},
    'BF': {'code': 'XOF', 'symbol': 'CFA', 'name': 'CFA Franc BCEAO'},
    'BG': {'code': 'BGN', 'symbol': 'лв', 'name': 'Bulgarian Lev'},
    'BH': {'code': 'BHD', 'symbol': '.د.ب', 'name': 'Bahraini Dinar'},
    'BI': {'code': 'BIF', 'symbol': 'FBu', 'name': 'Burundi Franc'},
    'BJ': {'code': 'XOF', 'symbol': 'CFA', 'name': 'CFA Franc BCEAO'},
    'BM': {'code': 'BMD', 'symbol': '$', 'name': 'Bermudian Dollar'},
    'BN': {'code': 'BND', 'symbol': '$', 'name': 'Brunei Dollar'},
    'BO': {'code': 'BOB', 'symbol': 'Bs.', 'name': 'Boliviano'},
    'BR': {'code': 'BRL', 'symbol': 'R$', 'name': 'Brazilian Real'},
    'BS': {'code': 'BSD', 'symbol': '$', 'name': 'Bahamian Dollar'},
    'BT': {'code': 'BTN', 'symbol': 'Nu.', 'name': 'Ngultrum'},
    'BW': {'code': 'BWP', 'symbol': 'P', 'name': 'Pula'},
    'BY': {'code': 'BYN', 'symbol': 'Br', 'name': 'Belarusian Ruble'},
    'BZ': {'code': 'BZD', 'symbol': '$', 'name': 'Belize Dollar'},
    
    # C
    'CA': {'code': 'CAD', 'symbol': '$', 'name': 'Canadian Dollar'},
    'CD': {'code': 'CDF', 'symbol': 'FC', 'name': 'Congolese Franc'},
    'CF': {'code': 'XAF', 'symbol': 'FCFA', 'name': 'CFA Franc BEAC'},
    'CG': {'code': 'XAF', 'symbol': 'FCFA', 'name': 'CFA Franc BEAC'},
    'CH': {'code': 'CHF', 'symbol': 'CHF', 'name': 'Swiss Franc'},
    'CI': {'code': 'XOF', 'symbol': 'CFA', 'name': 'CFA Franc BCEAO'},
    'CL': {'code': 'CLP', 'symbol': '$', 'name': 'Chilean Peso'},
    'CM': {'code': 'XAF', 'symbol': 'FCFA', 'name': 'CFA Franc BEAC'},
    'CN': {'code': 'CNY', 'symbol': '¥', 'name': 'Yuan Renminbi'},
    'CO': {'code': 'COP', 'symbol': '$', 'name': 'Colombian Peso'},
    'CR': {'code': 'CRC', 'symbol': '₡', 'name': 'Costa Rican Colon'},
    'CU': {'code': 'CUP', 'symbol': '₱', 'name': 'Cuban Peso'},
    'CV': {'code': 'CVE', 'symbol': '$', 'name': 'Cape Verde Escudo'},
    'CY': {'code': 'EUR', 'symbol': '€', 'name': 'Euro'},
    'CZ': {'code': 'CZK', 'symbol': 'Kč', 'name': 'Czech Koruna'},
    
    # D-Z (abbreviated for space, full list continues)
    'DE': {'code': 'EUR', 'symbol': '€', 'name': 'Euro'},
    'DK': {'code': 'DKK', 'symbol': 'kr', 'name': 'Danish Krone'},
    'DO': {'code': 'DOP', 'symbol': 'RD$', 'name': 'Dominican Peso'},
    'DZ': {'code': 'DZD', 'symbol': 'د.ج', 'name': 'Algerian Dinar'},
    
    'EC': {'code': 'USD', 'symbol': '$', 'name': 'US Dollar'},
    'EG': {'code': 'EGP', 'symbol': '£', 'name': 'Egyptian Pound'},
    'ES': {'code': 'EUR', 'symbol': '€', 'name': 'Euro'},
    'ET': {'code': 'ETB', 'symbol': 'Br', 'name': 'Ethiopian Birr'},
    
    'FI': {'code': 'EUR', 'symbol': '€', 'name': 'Euro'},
    'FR': {'code': 'EUR', 'symbol': '€', 'name': 'Euro'},
    
    'GB': {'code': 'GBP', 'symbol': '£', 'name': 'Pound Sterling'},
    'GH': {'code': 'GHS', 'symbol': '₵', 'name': 'Ghana Cedi'},
    
    'HK': {'code': 'HKD', 'symbol': '$', 'name': 'Hong Kong Dollar'},
    
    'ID': {'code': 'IDR', 'symbol': 'Rp', 'name': 'Rupiah'},
    'IE': {'code': 'EUR', 'symbol': '€', 'name': 'Euro'},
    'IL': {'code': 'ILS', 'symbol': '₪', 'name': 'New Israeli Sheqel'},
    'IN': {'code': 'INR', 'symbol': '₹', 'name': 'Indian Rupee'},
    'IQ': {'code': 'IQD', 'symbol': 'ع.د', 'name': 'Iraqi Dinar'},
    'IT': {'code': 'EUR', 'symbol': '€', 'name': 'Euro'},
    
    'JM': {'code': 'JMD', 'symbol': '$', 'name': 'Jamaican Dollar'},
    'JO': {'code': 'JOD', 'symbol': 'د.ا', 'name': 'Jordanian Dinar'},
    'JP': {'code': 'JPY', 'symbol': '¥', 'name': 'Yen'},
    
    'KE': {'code': 'KES', 'symbol': 'KSh', 'name': 'Kenyan Shilling'},
    'KR': {'code': 'KRW', 'symbol': '₩', 'name': 'Won'},
    'KW': {'code': 'KWD', 'symbol': 'د.ك', 'name': 'Kuwaiti Dinar'},
    
    'LB': {'code': 'LBP', 'symbol': 'ل.ل', 'name': 'Lebanese Pound'},
    'LK': {'code': 'LKR', 'symbol': 'Rs', 'name': 'Sri Lanka Rupee'},
    
    'MA': {'code': 'MAD', 'symbol': 'د.م.', 'name': 'Moroccan Dirham'},
    'MX': {'code': 'MXN', 'symbol': '$', 'name': 'Mexican Peso'},
    'MY': {'code': 'MYR', 'symbol': 'RM', 'name': 'Malaysian Ringgit'},
    
    'NG': {'code': 'NGN', 'symbol': '₦', 'name': 'Naira'},
    'NL': {'code': 'EUR', 'symbol': '€', 'name': 'Euro'},
    'NO': {'code': 'NOK', 'symbol': 'kr', 'name': 'Norwegian Krone'},
    'NZ': {'code': 'NZD', 'symbol': '$', 'name': 'New Zealand Dollar'},
    
    'OM': {'code': 'OMR', 'symbol': '﷼', 'name': 'Rial Omani'},
    
    'PA': {'code': 'PAB', 'symbol': 'B/.', 'name': 'Balboa'},
    'PE': {'code': 'PEN', 'symbol': 'S/', 'name': 'Sol'},
    'PH': {'code': 'PHP', 'symbol': '₱', 'name': 'Philippine Peso'},
    'PK': {'code': 'PKR', 'symbol': '₨', 'name': 'Pakistan Rupee'},
    'PL': {'code': 'PLN', 'symbol': 'zł', 'name': 'Zloty'},
    'PT': {'code': 'EUR', 'symbol': '€', 'name': 'Euro'},
    
    'QA': {'code': 'QAR', 'symbol': '﷼', 'name': 'Qatari Rial'},
    
    'RO': {'code': 'RON', 'symbol': 'lei', 'name': 'Romanian Leu'},
    'RU': {'code': 'RUB', 'symbol': '₽', 'name': 'Russian Ruble'},
    'RW': {'code': 'RWF', 'symbol': 'FRw', 'name': 'Rwanda Franc'},
    
    'SA': {'code': 'SAR', 'symbol': '﷼', 'name': 'Saudi Riyal'},
    'SD': {'code': 'SDG', 'symbol': 'ج.س.', 'name': 'Sudanese Pound'},
    'SE': {'code': 'SEK', 'symbol': 'kr', 'name': 'Swedish Krona'},
    'SG': {'code': 'SGD', 'symbol': '$', 'name': 'Singapore Dollar'},
    'SO': {'code': 'SOS', 'symbol': 'S', 'name': 'Somali Shilling'},
    'SS': {'code': 'SSP', 'symbol': 'SSP', 'name': 'South Sudanese Pound'},  # South Sudan
    
    'TH': {'code': 'THB', 'symbol': '฿', 'name': 'Baht'},
    'TN': {'code': 'TND', 'symbol': 'د.ت', 'name': 'Tunisian Dinar'},
    'TR': {'code': 'TRY', 'symbol': '₺', 'name': 'Turkish Lira'},
    'TZ': {'code': 'TZS', 'symbol': 'TSh', 'name': 'Tanzanian Shilling'},
    
    'UA': {'code': 'UAH', 'symbol': '₴', 'name': 'Hryvnia'},
    'UG': {'code': 'UGX', 'symbol': 'USh', 'name': 'Uganda Shilling'},
    'UK': {'code': 'GBP', 'symbol': '£', 'name': 'Pound Sterling'},
    'US': {'code': 'USD', 'symbol': '$', 'name': 'US Dollar'},
    'UY': {'code': 'UYU', 'symbol': '$U', 'name': 'Peso Uruguayo'},
    'UZ': {'code': 'UZS', 'symbol': 'лв', 'name': 'Uzbekistan Sum'},
    
    'VE': {'code': 'VES', 'symbol': 'Bs', 'name': 'Bolívar'},
    'VN': {'code': 'VND', 'symbol': '₫', 'name': 'Dong'},
    
    'YE': {'code': 'YER', 'symbol': '﷼', 'name': 'Yemeni Rial'},
    
    'ZA': {'code': 'ZAR', 'symbol': 'R', 'name': 'Rand'},
    'ZM': {'code': 'ZMW', 'symbol': 'ZK', 'name': 'Zambian Kwacha'},
    'ZW': {'code': 'ZWL', 'symbol': '$', 'name': 'Zimbabwe Dollar'},
}

def detect_currency_for_country(country_code):
    """
    Detect the appropriate currency for a country.
    
    Args:
        country_code: ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'SS')
    
    Returns:
        dict: Currency information with code, symbol, and name
    """
    if not country_code:
        logger.warning("🔸 [Currency Detection] No country code provided, defaulting to USD")
        return COUNTRY_TO_CURRENCY.get('US')
    
    # Convert to uppercase for consistency
    country_code = str(country_code).upper().strip()
    
    # Get currency for country
    currency = COUNTRY_TO_CURRENCY.get(country_code)
    
    if currency:
        logger.info(f"💰 [Currency Detection] Country {country_code} → {currency['code']} ({currency['symbol']})")
    else:
        logger.warning(f"🔸 [Currency Detection] No currency mapping for country: {country_code}, defaulting to USD")
        currency = COUNTRY_TO_CURRENCY.get('US')
    
    return currency

def auto_set_currency_for_business(business_details, country_code=None, force_update=False):
    """
    Automatically set currency for a business based on country.
    Only updates if currency hasn't been manually changed.
    
    Args:
        business_details: BusinessDetails model instance
        country_code: Optional country code override
        force_update: Force update even if manually changed
    
    Returns:
        bool: True if currency was updated, False otherwise
    """
    try:
        # Skip if currency was manually updated (unless forced)
        if business_details.currency_updated_at and not force_update:
            logger.info(f"⏭️  [Currency Detection] Skipping - currency manually updated on {business_details.currency_updated_at}")
            return False
        
        # Get country code from business or profile
        if not country_code:
            # Try to get from business
            if hasattr(business_details, 'business') and business_details.business:
                # Try business country field
                if hasattr(business_details.business, 'country'):
                    country_code = str(business_details.business.country)
                
                # Try via UserProfile
                if not country_code:
                    from users.models import UserProfile
                    profile = UserProfile.objects.filter(business_id=business_details.business.id).first()
                    if profile and profile.country:
                        country_code = str(profile.country)
        
        if not country_code:
            logger.warning(f"🔸 [Currency Detection] No country found for business, keeping current currency")
            return False
        
        # Detect currency for country
        currency_info = detect_currency_for_country(country_code)
        
        # Check if update needed
        if business_details.preferred_currency_code == currency_info['code']:
            logger.info(f"➡️  [Currency Detection] Already using correct currency: {currency_info['code']}")
            return False
        
        # Update currency
        old_currency = business_details.preferred_currency_code
        business_details.preferred_currency_code = currency_info['code']
        business_details.preferred_currency_name = currency_info['name']
        business_details.preferred_currency_symbol = currency_info['symbol']
        
        # Don't set currency_updated_at for auto-detection
        # This allows us to distinguish between auto and manual updates
        business_details.save(update_fields=[
            'preferred_currency_code',
            'preferred_currency_name', 
            'preferred_currency_symbol'
        ])
        
        logger.info(f"✅ [Currency Detection] Updated currency: {country_code} → {currency_info['code']} (was {old_currency})")
        return True
        
    except Exception as e:
        logger.error(f"❌ [Currency Detection] Error auto-setting currency: {str(e)}")
        return False

def initialize_currency_for_new_user(user, country_code=None):
    """
    Initialize currency for a new user during registration/onboarding.
    
    Args:
        user: User model instance
        country_code: Optional country code override
    
    Returns:
        dict: Currency information that was set
    """
    try:
        from users.models import Business, BusinessDetails, UserProfile
        
        logger.info(f"🎉 [Currency Detection] Initializing currency for new user: {user.email}")
        
        # Get user's business
        business = None
        if hasattr(user, 'business_id') and user.business_id:
            business = Business.objects.filter(id=user.business_id).first()
        elif hasattr(user, 'tenant_id') and user.tenant_id:
            business = Business.objects.filter(id=user.tenant_id).first()
        else:
            profile = UserProfile.objects.filter(user=user).first()
            if profile and profile.business_id:
                business = Business.objects.filter(id=profile.business_id).first()
        
        if not business:
            logger.warning(f"⚠️  [Currency Detection] No business found for user: {user.email}")
            return COUNTRY_TO_CURRENCY.get('US')
        
        # Get country if not provided
        if not country_code:
            profile = UserProfile.objects.filter(user=user).first()
            if profile and profile.country:
                country_code = str(profile.country)
            else:
                country_code = 'US'  # Default to US
        
        # Detect currency
        currency_info = detect_currency_for_country(country_code)
        
        # Get or create BusinessDetails
        business_details, created = BusinessDetails.objects.get_or_create(
            business=business,
            defaults={
                'preferred_currency_code': currency_info['code'],
                'preferred_currency_name': currency_info['name'],
                'preferred_currency_symbol': currency_info['symbol'],
                'show_usd_on_invoices': currency_info['code'] != 'USD',
                'show_usd_on_quotes': currency_info['code'] != 'USD',
                'accounting_standard': 'GAAP' if country_code == 'US' else 'IFRS'
            }
        )
        
        if created:
            logger.info(f"✨ [Currency Detection] Created BusinessDetails with {currency_info['code']} for: {business.name}")
        else:
            # Auto-update if not manually changed
            auto_set_currency_for_business(business_details, country_code)
        
        return currency_info
        
    except Exception as e:
        logger.error(f"❌ [Currency Detection] Error initializing currency: {str(e)}")
        return COUNTRY_TO_CURRENCY.get('US')