"""
Wise API integration for currency conversion and rates
"""
import os
import requests
import logging
from decimal import Decimal
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)

# Wise API configuration
WISE_API_BASE = 'https://api.wise.com'
WISE_API_TOKEN = os.getenv('WISE_API_TOKEN', '')
WISE_PROFILE_ID = os.getenv('WISE_PROFILE_ID', '')

# Currency mappings for supported countries
COUNTRY_CURRENCIES = {
    'KE': 'KES',  # Kenya Shilling
    'NG': 'NGN',  # Nigerian Naira
    'GH': 'GHS',  # Ghanaian Cedi
    'ZA': 'ZAR',  # South African Rand
    'UG': 'UGX',  # Ugandan Shilling
    'TZ': 'TZS',  # Tanzanian Shilling
    'RW': 'RWF',  # Rwandan Franc
    'ET': 'ETB',  # Ethiopian Birr
    'EG': 'EGP',  # Egyptian Pound
    'MA': 'MAD',  # Moroccan Dirham
    'IN': 'INR',  # Indian Rupee
    'BD': 'BDT',  # Bangladeshi Taka
    'PK': 'PKR',  # Pakistani Rupee
    'PH': 'PHP',  # Philippine Peso
    'ID': 'IDR',  # Indonesian Rupiah
    'VN': 'VND',  # Vietnamese Dong
    'BR': 'BRL',  # Brazilian Real
    'MX': 'MXN',  # Mexican Peso
    'CO': 'COP',  # Colombian Peso
    'AR': 'ARS',  # Argentine Peso
    'PE': 'PEN',  # Peruvian Sol
    'CL': 'CLP',  # Chilean Peso
}


class WiseError(Exception):
    """Base exception for Wise API errors"""
    pass


class WiseCurrencyService:
    """Service for handling currency conversion via Wise API"""
    
    def __init__(self):
        self.api_token = WISE_API_TOKEN
        self.profile_id = WISE_PROFILE_ID
        self.headers = {
            'Authorization': f'Bearer {self.api_token}',
            'Content-Type': 'application/json'
        }
    
    def get_exchange_rate(self, source_currency='USD', target_currency='KES', amount=100):
        """
        Get exchange rate from Wise API
        
        Args:
            source_currency: Source currency code (e.g., 'USD')
            target_currency: Target currency code (e.g., 'KES')
            amount: Amount to convert (for accurate fee calculation)
        
        Returns:
            Dict with rate and fee information
        """
        cache_key = f"wise_rate_{source_currency}_{target_currency}_{amount}"
        cached_rate = cache.get(cache_key)
        
        if cached_rate:
            return cached_rate
        
        try:
            # Get quote from Wise
            quote_url = f"{WISE_API_BASE}/v1/quotes"
            quote_data = {
                "sourceCurrency": source_currency,
                "targetCurrency": target_currency,
                "sourceAmount": float(amount),
                "profile": self.profile_id
            }
            
            response = requests.post(quote_url, json=quote_data, headers=self.headers)
            
            if response.status_code == 200:
                quote = response.json()
                
                rate_info = {
                    'rate': float(quote['rate']),
                    'source_amount': float(quote['sourceAmount']),
                    'target_amount': float(quote['targetAmount']),
                    'fee': float(quote['fee']),
                    'fee_percentage': (float(quote['fee']) / float(amount)) * 100,
                    'source_currency': source_currency,
                    'target_currency': target_currency,
                    'timestamp': datetime.now().isoformat()
                }
                
                # Cache for 5 minutes
                cache.set(cache_key, rate_info, 300)
                return rate_info
            else:
                logger.error(f"Wise API error: {response.status_code} - {response.text}")
                raise WiseError(f"Failed to get exchange rate: {response.text}")
                
        except requests.RequestException as e:
            logger.error(f"Request error getting exchange rate: {str(e)}")
            raise WiseError(f"Network error: {str(e)}")
    
    def convert_subscription_pricing(self, country_code, is_discounted=False):
        """
        Convert USD subscription prices to local currency
        
        Args:
            country_code: 2-letter country code
            is_discounted: Whether user has regional discount
        
        Returns:
            Dict with converted prices
        """
        target_currency = COUNTRY_CURRENCIES.get(country_code.upper())
        
        if not target_currency:
            # Return USD prices if currency not supported
            return self._get_usd_pricing(is_discounted)
        
        try:
            # Base USD prices
            usd_prices = self._get_usd_pricing(is_discounted)
            
            # Convert each price to local currency
            converted_prices = {
                'currency': target_currency,
                'country_code': country_code,
                'is_discounted': is_discounted,
                'professional': {},
                'enterprise': {}
            }
            
            for plan in ['professional', 'enterprise']:
                for cycle in ['monthly', 'six_month', 'yearly']:
                    usd_amount = usd_prices[plan][cycle]
                    
                    # Get conversion rate
                    rate_info = self.get_exchange_rate('USD', target_currency, usd_amount)
                    
                    # Add 1% markup for currency conversion
                    local_amount = rate_info['target_amount'] * 1.01
                    
                    converted_prices[plan][cycle] = round(local_amount, 0)  # Round to nearest whole number
                    converted_prices[plan][f'{cycle}_display'] = self._format_currency(local_amount, target_currency)
                    
                    # Calculate savings
                    if cycle == 'six_month':
                        monthly_amount = converted_prices[plan]['monthly']
                        converted_prices[plan]['six_month_savings'] = (monthly_amount * 6) - local_amount
                    elif cycle == 'yearly':
                        monthly_amount = converted_prices[plan]['monthly']
                        converted_prices[plan]['yearly_savings'] = (monthly_amount * 12) - local_amount
            
            # Add exchange rate info
            converted_prices['exchange_info'] = {
                'rate': rate_info['rate'],
                'markup_percentage': 1.0,
                'last_updated': rate_info['timestamp']
            }
            
            return converted_prices
            
        except WiseError as e:
            logger.error(f"Error converting prices for {country_code}: {str(e)}")
            # Fallback to USD pricing
            return self._get_usd_pricing(is_discounted)
    
    def _get_usd_pricing(self, is_discounted=False):
        """Get base USD pricing"""
        if is_discounted:
            return {
                'currency': 'USD',
                'professional': {
                    'monthly': 7.50,
                    'six_month': 39.00,
                    'yearly': 72.00,
                    'monthly_display': '$7.50',
                    'six_month_display': '$39.00',
                    'yearly_display': '$72.00'
                },
                'enterprise': {
                    'monthly': 22.50,
                    'six_month': 117.00,
                    'yearly': 216.00,
                    'monthly_display': '$22.50',
                    'six_month_display': '$117.00',
                    'yearly_display': '$216.00'
                }
            }
        else:
            return {
                'currency': 'USD',
                'professional': {
                    'monthly': 15.00,
                    'six_month': 78.00,
                    'yearly': 144.00,
                    'monthly_display': '$15.00',
                    'six_month_display': '$78.00',
                    'yearly_display': '$144.00'
                },
                'enterprise': {
                    'monthly': 45.00,
                    'six_month': 234.00,
                    'yearly': 432.00,
                    'monthly_display': '$45.00',
                    'six_month_display': '$234.00',
                    'yearly_display': '$432.00'
                }
            }
    
    def _format_currency(self, amount, currency):
        """Format currency amount with proper symbol"""
        currency_symbols = {
            'KES': 'KSh',
            'NGN': '₦',
            'GHS': 'GH₵',
            'ZAR': 'R',
            'UGX': 'USh',
            'TZS': 'TSh',
            'RWF': 'RWF',
            'ETB': 'ETB',
            'EGP': 'E£',
            'MAD': 'MAD',
            'INR': '₹',
            'BDT': '৳',
            'PKR': 'Rs',
            'PHP': '₱',
            'IDR': 'Rp',
            'VND': '₫',
            'BRL': 'R$',
            'MXN': '$',
            'COP': '$',
            'ARS': '$',
            'PEN': 'S/',
            'CLP': '$'
        }
        
        symbol = currency_symbols.get(currency, currency)
        
        # Format based on currency (some don't use decimals)
        if currency in ['KES', 'UGX', 'TZS', 'RWF', 'IDR', 'VND', 'CLP']:
            return f"{symbol}{int(amount):,}"
        else:
            return f"{symbol}{amount:,.2f}"
    
    def get_supported_currencies(self):
        """Get list of supported currencies"""
        return list(COUNTRY_CURRENCIES.values())
    
    def is_currency_supported(self, country_code):
        """Check if country has supported currency"""
        return country_code.upper() in COUNTRY_CURRENCIES


# Singleton instance
wise_service = WiseCurrencyService()