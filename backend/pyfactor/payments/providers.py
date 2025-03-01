from enum import Enum
from django.conf import settings
import importlib

class PaymentProviderType(Enum):
    CARD_PROCESSOR = "card_processor"
    BANK_CONNECTOR = "bank_connector"
    MOBILE_MONEY = "mobile_money"
    DIRECT_TRANSFER = "direct_transfer"

class PaymentProviderRegistry:
    """Registry of payment providers by country"""
    
    # Map of country codes to their preferred payment providers
    COUNTRY_PROVIDER_MAP = {
        # North America
        'US': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'CA': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'MX': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        
        # South America
        'AR': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'BO': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'BR': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'CL': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'CO': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'EC': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'GY': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'PY': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'PE': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'SR': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'UY': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'VE': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        
        # Central America & Caribbean
        'AG': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'BS': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'BB': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'BZ': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'CR': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'CU': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        'DM': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'DO': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'SV': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'GD': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'GT': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'HT': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'HN': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'JM': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'NI': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'PA': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'KN': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'LC': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'VC': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'TT': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        
        # Western Europe
        'AT': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'BE': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'FR': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'DE': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'IE': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'LI': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'LU': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'MC': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'NL': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'CH': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        
        # Northern Europe
        'DK': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'EE': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'FI': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'IS': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'LV': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'LT': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'NO': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'SE': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'GB': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        
        # Southern Europe
        'AD': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'CY': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'GR': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'IT': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'MT': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'PT': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'SM': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'ES': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'VA': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        
        # Eastern Europe
        'AL': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'AM': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'AZ': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'BY': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        'BA': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'BG': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'HR': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'CZ': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'GE': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'HU': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'KZ': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'XK': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'MD': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'ME': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'MK': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'PL': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'RO': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'RU': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'RS': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'SK': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'SI': {'primary': 'stripe', 'bank_connector': 'plaid', 'fallback': 'paypal', 'transfer': 'wise'},
        'TR': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'UA': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        
        # African Regions
        # North Africa
        'DZ': {'primary': 'stripe', 'fallback': 'flutterwave', 'transfer': 'wise'},
        'EG': {'primary': 'stripe', 'fallback': 'flutterwave', 'transfer': 'wise'},
        'LY': {'primary': 'stripe', 'fallback': 'flutterwave', 'transfer': 'wise'},
        'MA': {'primary': 'stripe', 'fallback': 'flutterwave', 'transfer': 'wise'},
        'SD': {'primary': 'stripe', 'fallback': 'flutterwave', 'transfer': 'wise'},
        'TN': {'primary': 'stripe', 'fallback': 'flutterwave', 'transfer': 'wise'},
        
        # West Africa
        'BJ': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'BF': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'CV': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'CI': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'GM': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'GH': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'GN': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'GW': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'LR': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'ML': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'MR': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'NE': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'NG': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'SN': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'SL': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'TG': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        
        # Central Africa
        'AO': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'CM': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'CF': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'TD': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'CG': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'CD': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'GQ': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'GA': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'ST': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        
        # East Africa
        'BI': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'KM': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'DJ': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'ER': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'ET': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'KE': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'MG': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'MW': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'MU': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'MZ': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'RW': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'SC': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'SO': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'SS': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'TZ': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'UG': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        
        # Southern Africa
        'BW': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'LS': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'NA': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'ZA': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'SZ': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'ZM': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        'ZW': {'primary': 'flutterwave', 'fallback': 'stripe', 'transfer': 'wise', 'mobile_money': 'flutterwave'},
        
        # Asia
        # Central Asia
        'KG': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'TJ': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        'TM': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        'UZ': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        
        # East Asia
        'CN': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'HK': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'JP': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'KR': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'MN': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'TW': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        
        # Southeast Asia
        'BN': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'KH': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'ID': {'primary': 'stripe', 'fallback': 'dlocal', 'transfer': 'wise'},
        'LA': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'MY': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'MM': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        'PH': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'SG': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'TH': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'TL': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'VN': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        
        # South Asia
        'AF': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        'BD': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'BT': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'IN': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},  # Will add Razorpay later
        'MV': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'NP': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'PK': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'LK': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        
        # Western Asia/Middle East
        'BH': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'IQ': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        'IL': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'JO': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'KW': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'LB': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'OM': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'PS': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'QA': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'SA': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'SY': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        'AE': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'YE': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        
        # Oceania
        'AU': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'NZ': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'FJ': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'PG': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'SB': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        'VU': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'KI': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        'MH': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'FM': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'NR': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        'PW': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'CK': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'PF': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'NU': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        'WS': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'TO': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'},
        'TV': {'primary': 'stripe', 'fallback': 'wise', 'transfer': 'wise'},
        
        # Countries with restrictions - limited provider options
        'KP': {'primary': 'none', 'fallback': 'none', 'transfer': 'none'},  # North Korea
        'IR': {'primary': 'none', 'fallback': 'none', 'transfer': 'none'},  # Iran
        
        # Default (fallback to Stripe/PayPal for any unlisted countries)
        'default': {'primary': 'stripe', 'fallback': 'paypal', 'transfer': 'wise'}
    }
    
    @staticmethod
    def get_provider_for_country(country_code, provider_type=None):
        """
        Get the appropriate payment provider for a country
        
        Args:
            country_code: Two-letter country code
            provider_type: Type of provider to fetch (primary, bank_connector, mobile_money, fallback, transfer)
            
        Returns:
            Payment provider instance
        """
        country_code = country_code.upper()
        country_providers = PaymentProviderRegistry.COUNTRY_PROVIDER_MAP.get(
            country_code, 
            PaymentProviderRegistry.COUNTRY_PROVIDER_MAP['default']
        )
        
        if provider_type and provider_type in country_providers:
            provider_name = country_providers[provider_type]
        else:
            provider_name = country_providers['primary']
            
        return PaymentProviderRegistry.get_provider_by_name(provider_name)
    
    @staticmethod
    def get_provider_by_name(provider_name):
        """Load and return provider instance by name"""
        try:
            provider_module = importlib.import_module(f'payments.providers.{provider_name}')
            return provider_module.Provider()
        except (ImportError, AttributeError) as e:
            print(f"Error loading provider {provider_name}: {e}")
            # Fallback to default provider
            if provider_name == 'none':
                raise ValueError("No payment provider available for this country")
            default_module = importlib.import_module('payments.providers.stripe')
            return default_module.Provider()