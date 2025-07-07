"""
Payment Provider Country Support and Configuration
"""

# Stripe Connect Countries (where we can pay out via Stripe)
STRIPE_CONNECT_COUNTRIES = [
    # Americas
    'US', 'CA', 'MX', 'BR',
    
    # Europe
    'GB', 'IE', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 
    'PT', 'PL', 'EE', 'LV', 'LT', 'LU', 'SK', 'SI', 'GR', 'CZ', 'RO', 'BG', 'HR', 'CY', 'MT',
    
    # Asia-Pacific
    'AU', 'NZ', 'JP', 'SG', 'HK', 'IN', 'MY', 'TH',
    
    # Middle East
    'AE',
]

# Wise Supported Countries (covers almost everywhere)
WISE_SUPPORTED_COUNTRIES = [
    # All Stripe countries PLUS:
    *STRIPE_CONNECT_COUNTRIES,
    
    # Africa (NOT in Stripe)
    'KE', 'NG', 'GH', 'ZA', 'UG', 'TZ', 'RW', 'EG', 'MA', 'TN', 'SN', 'CI', 'CM', 'ZM', 'ZW',
    
    # Asia (NOT in Stripe)
    'BD', 'PK', 'VN', 'PH', 'ID', 'LK', 'NP', 'MM', 'KH', 'CN', 'KR', 'TW',
    
    # Latin America (NOT in Stripe)
    'AR', 'CL', 'CO', 'PE', 'UY', 'PY', 'BO', 'EC', 'VE', 'GT', 'CR', 'PA', 'DO', 'SV', 'HN', 'NI',
    
    # Europe (NOT in Stripe)
    'UA', 'RS', 'BA', 'MK', 'AL', 'MD', 'GE', 'AM', 'AZ', 'BY', 'KZ', 'RU', 'TR',
    
    # Oceania
    'FJ', 'PG',
    
    # Caribbean
    'JM', 'TT', 'BB',
]

# Mobile Money Countries (primarily Africa and parts of Asia)
MOBILE_MONEY_COUNTRIES = {
    # M-Pesa Countries
    'KE': {
        'providers': ['mpesa'],
        'name': 'Kenya',
        'currencies': ['KES'],
    },
    'TZ': {
        'providers': ['mpesa', 'tigopesa', 'airtelmoney'],
        'name': 'Tanzania',
        'currencies': ['TZS'],
    },
    
    # MTN Mobile Money
    'GH': {
        'providers': ['mtn_momo', 'airteltigo', 'vodafone_cash'],
        'name': 'Ghana', 
        'currencies': ['GHS'],
    },
    'UG': {
        'providers': ['mtn_momo', 'airtel_money'],
        'name': 'Uganda',
        'currencies': ['UGX'],
    },
    'RW': {
        'providers': ['mtn_momo', 'airtel_money'],
        'name': 'Rwanda',
        'currencies': ['RWF'],
    },
    'ZM': {
        'providers': ['mtn_momo', 'airtel_money'],
        'name': 'Zambia',
        'currencies': ['ZMW'],
    },
    'CM': {
        'providers': ['mtn_momo', 'orange_money'],
        'name': 'Cameroon',
        'currencies': ['XAF'],
    },
    'CI': {
        'providers': ['mtn_momo', 'orange_money', 'moov_money'],
        'name': 'Ivory Coast',
        'currencies': ['XOF'],
    },
    
    # Nigeria (Multiple providers)
    'NG': {
        'providers': ['paystack', 'flutterwave', 'interswitch'],
        'name': 'Nigeria',
        'currencies': ['NGN'],
    },
    
    # Orange Money Countries
    'SN': {
        'providers': ['orange_money', 'wave', 'free_money'],
        'name': 'Senegal',
        'currencies': ['XOF'],
    },
    'ML': {
        'providers': ['orange_money', 'moov_money'],
        'name': 'Mali',
        'currencies': ['XOF'],
    },
    'BF': {
        'providers': ['orange_money', 'moov_money'],
        'name': 'Burkina Faso',
        'currencies': ['XOF'],
    },
    
    # Asia Mobile Money
    'BD': {
        'providers': ['bkash', 'nagad', 'rocket'],
        'name': 'Bangladesh',
        'currencies': ['BDT'],
    },
    'PH': {
        'providers': ['gcash', 'paymaya'],
        'name': 'Philippines',
        'currencies': ['PHP'],
    },
    'PK': {
        'providers': ['easypaisa', 'jazzcash'],
        'name': 'Pakistan',
        'currencies': ['PKR'],
    },
    'IN': {
        'providers': ['paytm', 'phonepe', 'googlepay'],
        'name': 'India',
        'currencies': ['INR'],
    },
    
    # Other Africa
    'ZW': {
        'providers': ['ecocash', 'onemoney'],
        'name': 'Zimbabwe',
        'currencies': ['USD', 'ZWL'],
    },
    'MW': {
        'providers': ['airtel_money', 'tnm_mpamba'],
        'name': 'Malawi',
        'currencies': ['MWK'],
    },
    'MZ': {
        'providers': ['mpesa', 'emola'],
        'name': 'Mozambique',
        'currencies': ['MZN'],
    },
    'EG': {
        'providers': ['vodafone_cash', 'orange_cash', 'etisalat_cash'],
        'name': 'Egypt',
        'currencies': ['EGP'],
    },
}

# Paystack Supported Countries (for direct integration)
PAYSTACK_COUNTRIES = ['NG', 'GH', 'ZA', 'KE']

# Currency configurations
CURRENCY_CONFIG = {
    'USD': {'symbol': '$', 'decimal_places': 2},
    'EUR': {'symbol': '€', 'decimal_places': 2},
    'GBP': {'symbol': '£', 'decimal_places': 2},
    'KES': {'symbol': 'KSh', 'decimal_places': 2},
    'NGN': {'symbol': '₦', 'decimal_places': 2},
    'GHS': {'symbol': 'GH₵', 'decimal_places': 2},
    'ZAR': {'symbol': 'R', 'decimal_places': 2},
    'UGX': {'symbol': 'USh', 'decimal_places': 0},
    'TZS': {'symbol': 'TSh', 'decimal_places': 0},
    'RWF': {'symbol': 'FRw', 'decimal_places': 0},
    'INR': {'symbol': '₹', 'decimal_places': 2},
    'BDT': {'symbol': '৳', 'decimal_places': 2},
    'PKR': {'symbol': '₨', 'decimal_places': 2},
    'PHP': {'symbol': '₱', 'decimal_places': 2},
    'IDR': {'symbol': 'Rp', 'decimal_places': 0},
    'XOF': {'symbol': 'CFA', 'decimal_places': 0},
    'XAF': {'symbol': 'FCFA', 'decimal_places': 0},
}


def get_available_payment_methods(country_code):
    """
    Get available payment methods for a specific country
    """
    methods = []
    
    # Check Stripe support
    if country_code in STRIPE_CONNECT_COUNTRIES:
        methods.append({
            'provider': 'stripe',
            'name': 'Bank Transfer (Stripe)',
            'type': 'bank_transfer',
            'processing_time': '1-3 business days',
        })
    
    # Check Wise support
    if country_code in WISE_SUPPORTED_COUNTRIES:
        methods.append({
            'provider': 'wise',
            'name': 'Bank Transfer (Wise)',
            'type': 'bank_transfer',
            'processing_time': '1-2 business days',
        })
    
    # Check Mobile Money support
    if country_code in MOBILE_MONEY_COUNTRIES:
        country_mm = MOBILE_MONEY_COUNTRIES[country_code]
        methods.append({
            'provider': 'mobile_money',
            'name': 'Mobile Money',
            'type': 'mobile_money',
            'processing_time': 'Instant',
            'available_providers': country_mm['providers'],
        })
    
    return methods


def get_optimal_provider(country_code, payment_method_preference=None):
    """
    Get the optimal payment provider for a country
    Priority: Mobile Money (if available) > Stripe > Wise
    """
    if payment_method_preference == 'mobile_money' and country_code in MOBILE_MONEY_COUNTRIES:
        return 'mobile_money'
    
    # For countries with both Stripe and Wise, prefer Stripe (cheaper)
    if country_code in STRIPE_CONNECT_COUNTRIES:
        return 'stripe'
    
    # Fallback to Wise for all other countries
    if country_code in WISE_SUPPORTED_COUNTRIES:
        return 'wise'
    
    # Country not supported
    return None


def is_country_supported(country_code):
    """
    Check if we can process payroll for this country
    """
    return (
        country_code in STRIPE_CONNECT_COUNTRIES or
        country_code in WISE_SUPPORTED_COUNTRIES or
        country_code in MOBILE_MONEY_COUNTRIES
    )