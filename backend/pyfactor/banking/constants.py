"""
Banking Provider Constants
Centralized configuration for banking providers
Keep in sync with frontend: /frontend/pyfactor_next/src/config/bankingProviders.js
"""

# Countries where Plaid is available for direct bank connections
PLAID_SUPPORTED_COUNTRIES = [
    'US',  # United States
    'CA',  # Canada
    'GB',  # United Kingdom
    'FR',  # France
    'ES',  # Spain
    'NL',  # Netherlands
    'IE',  # Ireland
    'DE',  # Germany
    'IT',  # Italy
    'PL',  # Poland
    'DK',  # Denmark
    'NO',  # Norway
    'SE',  # Sweden
    'EE',  # Estonia
    'LT',  # Lithuania
    'LV',  # Latvia
    'PT',  # Portugal
    'BE',  # Belgium
]

# Common countries using Wise (non-exhaustive list)
WISE_COMMON_COUNTRIES = [
    'SS',  # South Sudan
    'KE',  # Kenya
    'NG',  # Nigeria
    'ZA',  # South Africa
    'GH',  # Ghana
    'TZ',  # Tanzania
    'UG',  # Uganda
    'ET',  # Ethiopia
    'RW',  # Rwanda
    'SN',  # Senegal
    'IN',  # India
    'PK',  # Pakistan
    'BD',  # Bangladesh
    'PH',  # Philippines
    'ID',  # Indonesia
    'MY',  # Malaysia
    'TH',  # Thailand
    'VN',  # Vietnam
    'AU',  # Australia
    'NZ',  # New Zealand
    'JP',  # Japan
    'KR',  # South Korea
    'CN',  # China
    'BR',  # Brazil
    'MX',  # Mexico
    'AR',  # Argentina
    'CL',  # Chile
    'CO',  # Colombia
]

def get_banking_provider(country_code):
    """
    Determine the appropriate banking provider for a country
    
    Args:
        country_code (str): Two-letter ISO country code
        
    Returns:
        str: 'plaid' or 'wise'
    """
    if not country_code:
        return 'wise'  # Default to Wise for international/unknown
    
    # Normalize to uppercase
    country = country_code.upper()
    
    # Check if country supports Plaid
    return 'plaid' if country in PLAID_SUPPORTED_COUNTRIES else 'wise'

def is_plaid_supported(country_code):
    """
    Check if Plaid is supported in a country
    
    Args:
        country_code (str): Two-letter ISO country code
        
    Returns:
        bool: True if Plaid is supported
    """
    if not country_code:
        return False
    
    return country_code.upper() in PLAID_SUPPORTED_COUNTRIES

def is_wise_preferred(country_code):
    """
    Check if Wise is the preferred provider for a country
    
    Args:
        country_code (str): Two-letter ISO country code
        
    Returns:
        bool: True if Wise is preferred (country not in Plaid list)
    """
    return not is_plaid_supported(country_code)