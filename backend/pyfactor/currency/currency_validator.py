"""
Currency validation and business logic
Ensures all currency operations are valid and handles edge cases
"""
import logging
from decimal import Decimal, InvalidOperation
from django.core.exceptions import ValidationError
from .currency_data import CURRENCY_DATA, get_currency_info

logger = logging.getLogger(__name__)


class CurrencyValidator:
    """Validates currency operations and data"""
    
    @staticmethod
    def validate_currency_code(currency_code):
        """
        Validate a currency code
        Returns normalized currency code or raises ValidationError
        """
        if not currency_code:
            raise ValidationError("Currency code is required")
        
        # Normalize to uppercase
        currency_code = currency_code.upper().strip()
        
        # Check if currency exists
        currency_info = get_currency_info(currency_code)
        if not currency_info:
            raise ValidationError(f"Invalid currency code: {currency_code}")
        
        return currency_code
    
    @staticmethod
    def validate_amount(amount, currency_code=None):
        """
        Validate an amount for currency operations
        Returns Decimal amount or raises ValidationError
        """
        if amount is None:
            raise ValidationError("Amount is required")
        
        try:
            # Convert to Decimal
            decimal_amount = Decimal(str(amount))
            
            # Check for negative amounts
            if decimal_amount < 0:
                raise ValidationError("Amount cannot be negative")
            
            # Check for reasonable limits
            if decimal_amount > Decimal('999999999999.99'):
                raise ValidationError("Amount exceeds maximum allowed value")
            
            # If currency provided, validate decimal places
            if currency_code:
                currency_info = get_currency_info(currency_code)
                if currency_info:
                    decimal_places = currency_info.get('decimal_places', 2)
                    # Round to appropriate decimal places
                    decimal_amount = decimal_amount.quantize(
                        Decimal('0.1') ** decimal_places
                    )
            
            return decimal_amount
            
        except (InvalidOperation, ValueError) as e:
            raise ValidationError(f"Invalid amount: {amount}")
    
    @staticmethod
    def validate_currency_update(user, new_currency_code):
        """
        Validate that a user can update to a specific currency
        Returns validated currency code or raises ValidationError
        """
        # Validate the currency code
        new_currency_code = CurrencyValidator.validate_currency_code(new_currency_code)
        
        # Check user permissions (must be OWNER or ADMIN)
        if hasattr(user, 'role') and user.role not in ['OWNER', 'ADMIN']:
            raise ValidationError("Only business owners and admins can update currency preferences")
        
        # Log the update attempt
        logger.info(f"User {user.email} attempting to update currency to {new_currency_code}")
        
        return new_currency_code
    
    @staticmethod
    def validate_exchange_rate_request(from_currency, to_currency, amount=None):
        """
        Validate an exchange rate request
        Returns validated tuple (from_currency, to_currency, amount)
        """
        # Validate currencies
        from_currency = CurrencyValidator.validate_currency_code(from_currency)
        to_currency = CurrencyValidator.validate_currency_code(to_currency)
        
        # Validate amount if provided
        if amount is not None:
            amount = CurrencyValidator.validate_amount(amount, from_currency)
        else:
            amount = Decimal('1')
        
        return from_currency, to_currency, amount
    
    @staticmethod
    def format_currency_for_display(amount, currency_code):
        """
        Format an amount for display with proper currency symbol and formatting
        """
        try:
            # Validate inputs
            currency_code = CurrencyValidator.validate_currency_code(currency_code)
            amount = CurrencyValidator.validate_amount(amount, currency_code)
            
            # Get currency info
            currency_info = get_currency_info(currency_code)
            if not currency_info:
                return f"{currency_code} {amount}"
            
            # Format based on currency settings
            symbol = currency_info.get('symbol', currency_code)
            decimal_places = currency_info.get('decimal_places', 2)
            position = currency_info.get('symbol_position', 'before')
            
            # Format the amount
            formatted_amount = f"{amount:,.{decimal_places}f}"
            
            # Apply symbol position
            if position == 'before':
                return f"{symbol}{formatted_amount}"
            else:
                return f"{formatted_amount} {symbol}"
                
        except Exception as e:
            logger.error(f"Error formatting currency: {e}")
            return f"{currency_code} {amount}"


class CurrencyConversionValidator:
    """Validates currency conversion operations"""
    
    @staticmethod
    def validate_conversion(amount, from_currency, to_currency, rate):
        """
        Validate a currency conversion
        Returns converted amount or raises ValidationError
        """
        # Validate inputs
        amount = CurrencyValidator.validate_amount(amount, from_currency)
        from_currency = CurrencyValidator.validate_currency_code(from_currency)
        to_currency = CurrencyValidator.validate_currency_code(to_currency)
        
        # Validate rate
        if not rate or rate <= 0:
            raise ValidationError("Invalid exchange rate")
        
        try:
            rate = Decimal(str(rate))
        except (InvalidOperation, ValueError):
            raise ValidationError("Invalid exchange rate format")
        
        # Calculate converted amount
        converted = amount * rate
        
        # Get target currency info
        currency_info = get_currency_info(to_currency)
        if currency_info:
            decimal_places = currency_info.get('decimal_places', 2)
            converted = converted.quantize(Decimal('0.1') ** decimal_places)
        
        return converted
    
    @staticmethod
    def validate_rate_age(timestamp, currency_code):
        """
        Check if an exchange rate is too old
        Returns True if rate is outdated
        """
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        if not timestamp:
            return True
        
        # Convert to datetime if string
        if isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except:
                return True
        
        # Make timezone aware if needed
        if timezone.is_naive(timestamp):
            timestamp = timezone.make_aware(timestamp)
        
        now = timezone.now()
        age = now - timestamp
        
        # Different currencies have different volatility
        volatile_currencies = ['ZWL', 'VEF', 'ARS', 'TRY', 'NGN', 'GHS']
        
        if currency_code in volatile_currencies:
            # Volatile currencies: 1 hour max
            return age > timedelta(hours=1)
        else:
            # Normal currencies: 4 hours max
            return age > timedelta(hours=4)