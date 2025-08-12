"""
Exchange Rate Service for multi-currency support
Integrates with Wise API (primary) and CurrencyAPI (fallback)
"""
import logging
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from decimal import Decimal
from django.core.cache import cache
from django.conf import settings
import json

logger = logging.getLogger(__name__)


class ExchangeRateService:
    """
    Service for fetching and caching exchange rates
    Uses Wise API as primary source, CurrencyAPI as fallback
    """
    
    # Cache keys
    CACHE_KEY_PREFIX = "exchange_rate"
    CACHE_DURATION = 4 * 60 * 60  # 4 hours in seconds
    
    # Volatile currencies that need more frequent updates
    VOLATILE_CURRENCIES = ['VES', 'ZWL', 'SSP', 'LBP', 'SYP', 'IRR', 'ARS']
    VOLATILE_CACHE_DURATION = 60 * 60  # 1 hour for volatile currencies
    
    def __init__(self):
        self.wise_api_key = getattr(settings, 'WISE_API_KEY', None)
        self.currency_api_key = getattr(settings, 'CURRENCY_API_KEY', None)
        
    def get_exchange_rate(self, from_currency: str, to_currency: str = 'USD') -> Tuple[Optional[Decimal], Optional[Dict]]:
        """
        Get exchange rate from one currency to another (default USD)
        Returns: (rate, metadata) where metadata includes source and timestamp
        """
        # If same currency, return 1
        if from_currency == to_currency:
            return Decimal('1'), {
                'source': 'direct',
                'timestamp': datetime.utcnow().isoformat(),
                'from_currency': from_currency,
                'to_currency': to_currency
            }
        
        # Check cache first
        cache_key = f"{self.CACHE_KEY_PREFIX}:{from_currency}:{to_currency}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            logger.info(f"Using cached exchange rate for {from_currency}/{to_currency}")
            return Decimal(str(cached_data['rate'])), cached_data['metadata']
        
        # Try Wise API first
        rate, metadata = self._fetch_from_wise(from_currency, to_currency)
        
        # If Wise fails, try CurrencyAPI
        if rate is None:
            logger.warning(f"Wise API failed for {from_currency}/{to_currency}, trying CurrencyAPI")
            rate, metadata = self._fetch_from_currency_api(from_currency, to_currency)
        
        # Cache the result if successful
        if rate is not None:
            cache_duration = (
                self.VOLATILE_CACHE_DURATION 
                if from_currency in self.VOLATILE_CURRENCIES 
                else self.CACHE_DURATION
            )
            
            cache_data = {
                'rate': str(rate),
                'metadata': metadata
            }
            cache.set(cache_key, cache_data, cache_duration)
            
        return rate, metadata
    
    def _fetch_from_wise(self, from_currency: str, to_currency: str) -> Tuple[Optional[Decimal], Optional[Dict]]:
        """
        Fetch exchange rate from Wise API
        """
        if not self.wise_api_key:
            logger.error("WISE_API_KEY not configured")
            return None, None
            
        try:
            # Wise API endpoint
            url = f"https://api.wise.com/v1/rates"
            
            headers = {
                'Authorization': f'Bearer {self.wise_api_key}',
                'Content-Type': 'application/json'
            }
            
            params = {
                'source': from_currency,
                'target': to_currency
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Extract rate from Wise response
            if data and len(data) > 0:
                rate = Decimal(str(data[0]['rate']))
                
                metadata = {
                    'source': 'wise',
                    'timestamp': datetime.utcnow().isoformat(),
                    'from_currency': from_currency,
                    'to_currency': to_currency,
                    'raw_response': data[0]
                }
                
                logger.info(f"Wise API: {from_currency}/{to_currency} = {rate}")
                return rate, metadata
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Wise API request failed: {str(e)}")
        except (KeyError, ValueError, IndexError) as e:
            logger.error(f"Wise API response parsing failed: {str(e)}")
            
        return None, None
    
    def _fetch_from_currency_api(self, from_currency: str, to_currency: str) -> Tuple[Optional[Decimal], Optional[Dict]]:
        """
        Fetch exchange rate from CurrencyAPI (fallback)
        """
        if not self.currency_api_key:
            logger.error("CURRENCY_API_KEY not configured")
            return None, None
            
        try:
            # CurrencyAPI endpoint
            url = f"https://api.currencyapi.com/v3/latest"
            
            headers = {
                'apikey': self.currency_api_key
            }
            
            params = {
                'base_currency': from_currency,
                'currencies': to_currency
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Extract rate from CurrencyAPI response
            if 'data' in data and to_currency in data['data']:
                rate = Decimal(str(data['data'][to_currency]['value']))
                
                metadata = {
                    'source': 'currencyapi',
                    'timestamp': datetime.utcnow().isoformat(),
                    'from_currency': from_currency,
                    'to_currency': to_currency,
                    'last_updated': data['meta']['last_updated_at']
                }
                
                logger.info(f"CurrencyAPI: {from_currency}/{to_currency} = {rate}")
                return rate, metadata
                
        except requests.exceptions.RequestException as e:
            logger.error(f"CurrencyAPI request failed: {str(e)}")
        except (KeyError, ValueError) as e:
            logger.error(f"CurrencyAPI response parsing failed: {str(e)}")
            
        return None, None
    
    def get_last_known_rate(self, from_currency: str, to_currency: str = 'USD') -> Tuple[Optional[Decimal], Optional[Dict]]:
        """
        Get last known rate from database (for when APIs fail)
        This would typically query a ExchangeRateHistory model
        """
        # TODO: Implement database fallback
        logger.warning(f"No last known rate available for {from_currency}/{to_currency}")
        return None, None
    
    def convert_amount(self, amount: Decimal, from_currency: str, to_currency: str = 'USD') -> Tuple[Optional[Decimal], Optional[Dict]]:
        """
        Convert an amount from one currency to another
        Returns: (converted_amount, exchange_rate_metadata)
        """
        rate, metadata = self.get_exchange_rate(from_currency, to_currency)
        
        if rate is None:
            return None, None
            
        converted = amount * rate
        
        # Add conversion details to metadata
        if metadata:
            metadata['original_amount'] = str(amount)
            metadata['converted_amount'] = str(converted)
            metadata['exchange_rate'] = str(rate)
            
        return converted, metadata
    
    def is_rate_outdated(self, timestamp: str, currency: str) -> bool:
        """
        Check if a rate timestamp is outdated based on currency volatility
        """
        try:
            rate_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            now = datetime.utcnow()
            
            if currency in self.VOLATILE_CURRENCIES:
                # Volatile currencies: outdated after 1 hour
                return (now - rate_time) > timedelta(hours=1)
            else:
                # Normal currencies: outdated after 24 hours
                return (now - rate_time) > timedelta(hours=24)
                
        except (ValueError, AttributeError):
            # If we can't parse the timestamp, consider it outdated
            return True


# Singleton instance
exchange_rate_service = ExchangeRateService()