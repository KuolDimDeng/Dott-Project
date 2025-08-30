"""
Paystack M-Pesa Currency Conversion Service
Handles SSP to KES conversion for cross-border payments
"""

from decimal import Decimal
from typing import Dict, Any

# Exchange rates (approximate - should be fetched from API in production)
EXCHANGE_RATES = {
    'SSP_TO_KES': Decimal('0.87'),  # 1 SSP = 0.87 KES (approximate)
    'SSP_TO_USD': Decimal('0.0033'),  # 1 SSP = 0.0033 USD
    'KES_TO_USD': Decimal('0.0078'),  # 1 KES = 0.0078 USD
    'USD_TO_KES': Decimal('128.50'),  # 1 USD = 128.50 KES
}

def convert_currency(amount: Decimal, from_currency: str, to_currency: str) -> Dict[str, Any]:
    """
    Convert amount from one currency to another
    
    Returns:
        Dict with converted amount and exchange rate used
    """
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()
    
    if from_currency == to_currency:
        return {
            'success': True,
            'original_amount': amount,
            'converted_amount': amount,
            'exchange_rate': Decimal('1.0'),
            'from_currency': from_currency,
            'to_currency': to_currency
        }
    
    # SSP to KES conversion (for South Sudan to Kenya payments)
    if from_currency == 'SSP' and to_currency == 'KES':
        rate = EXCHANGE_RATES['SSP_TO_KES']
        converted = amount * rate
        return {
            'success': True,
            'original_amount': amount,
            'converted_amount': converted.quantize(Decimal('0.01')),
            'exchange_rate': rate,
            'from_currency': from_currency,
            'to_currency': to_currency,
            'note': 'Approximate rate - final amount may vary'
        }
    
    # Handle other conversions via USD
    elif from_currency == 'SSP' and to_currency in ['USD', 'GHS', 'NGN']:
        # First convert to USD
        usd_amount = amount * EXCHANGE_RATES['SSP_TO_USD']
        
        if to_currency == 'USD':
            converted = usd_amount
        elif to_currency == 'KES':
            converted = usd_amount * EXCHANGE_RATES['USD_TO_KES']
        else:
            # Add more conversions as needed
            converted = usd_amount
        
        return {
            'success': True,
            'original_amount': amount,
            'converted_amount': converted.quantize(Decimal('0.01')),
            'exchange_rate': converted / amount,
            'from_currency': from_currency,
            'to_currency': to_currency,
            'via_usd': True
        }
    
    # Currency pair not supported
    return {
        'success': False,
        'error': f'Currency conversion from {from_currency} to {to_currency} not supported',
        'supported_pairs': ['SSP->KES', 'SSP->USD', 'KES->USD']
    }

def get_minimum_amount(currency: str) -> Decimal:
    """Get minimum payment amount for a currency"""
    minimums = {
        'KES': Decimal('10.00'),   # 10 KES minimum
        'SSP': Decimal('100.00'),  # 100 SSP minimum
        'USD': Decimal('1.00'),    # 1 USD minimum
        'GHS': Decimal('1.00'),    # 1 GHS minimum
        'NGN': Decimal('100.00'),  # 100 NGN minimum
    }
    return minimums.get(currency.upper(), Decimal('1.00'))