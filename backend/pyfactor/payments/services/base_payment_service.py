"""
Base Payment Service
Abstract base class for all mobile money payment providers
"""

from abc import ABC, abstractmethod
from typing import Dict, Optional, Any, Tuple
import logging
import hashlib
import hmac
import json
from decimal import Decimal
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

logger = logging.getLogger(__name__)


class BasePaymentService(ABC):
    """Base class for payment service implementations"""
    
    def __init__(self, provider_name: str):
        self.provider_name = provider_name
        self.session = self._create_session()
        self.timeout = 30  # seconds
        self.max_retries = 3
        
    def _create_session(self) -> requests.Session:
        """Create a requests session with retry logic"""
        session = requests.Session()
        retry = Retry(
            total=self.max_retries,
            read=self.max_retries,
            connect=self.max_retries,
            backoff_factor=0.3,
            status_forcelist=(500, 502, 504)
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        return session
    
    @abstractmethod
    def authenticate(self) -> Dict[str, Any]:
        """Authenticate with the payment provider"""
        pass
    
    @abstractmethod
    def request_payment(
        self,
        amount: Decimal,
        phone_number: str,
        reference: str,
        currency: str = 'USD',
        message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Request payment from customer"""
        pass
    
    @abstractmethod
    def check_payment_status(self, reference: str) -> Dict[str, Any]:
        """Check status of a payment"""
        pass
    
    @abstractmethod
    def process_refund(
        self,
        original_reference: str,
        amount: Decimal,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process a refund"""
        pass
    
    @abstractmethod
    def verify_webhook(self, headers: Dict, payload: str, signature: str) -> bool:
        """Verify webhook signature"""
        pass
    
    def get_cached_token(self, key: str) -> Optional[str]:
        """Get cached authentication token"""
        cache_key = f"payment_token_{self.provider_name}_{key}"
        return cache.get(cache_key)
    
    def set_cached_token(self, key: str, token: str, expires_in: int = 3600):
        """Cache authentication token"""
        cache_key = f"payment_token_{self.provider_name}_{key}"
        cache.set(cache_key, token, expires_in - 60)  # Expire 1 minute before actual expiry
    
    def validate_phone_number(self, phone_number: str) -> Tuple[bool, str]:
        """Validate and format phone number"""
        # Remove spaces and special characters
        phone = ''.join(filter(str.isdigit, phone_number))
        
        # Add country code if missing
        if not phone.startswith('+'):
            # Default to East Africa codes if no country code
            if len(phone) == 9:  # Kenya without 254
                phone = f"254{phone}"
            elif len(phone) == 10 and phone.startswith('0'):  # Kenya with leading 0
                phone = f"254{phone[1:]}"
            elif len(phone) == 10 and phone.startswith('7'):  # Uganda without 256
                phone = f"256{phone}"
            
        # Validate length (should be 10-15 digits)
        if len(phone) < 10 or len(phone) > 15:
            return False, "Invalid phone number length"
        
        return True, phone
    
    def calculate_signature(self, payload: str, secret: str) -> str:
        """Calculate HMAC signature for webhook verification"""
        return hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    def log_transaction(self, action: str, data: Dict, response: Optional[Dict] = None):
        """Log transaction for audit trail"""
        log_data = {
            'provider': self.provider_name,
            'action': action,
            'timestamp': timezone.now().isoformat(),
            'data': data
        }
        
        if response:
            log_data['response'] = response
        
        logger.info(f"Payment Transaction: {json.dumps(log_data)}")
    
    def handle_error(self, error: Exception, context: Dict) -> Dict[str, Any]:
        """Standardized error handling"""
        error_response = {
            'success': False,
            'error': str(error),
            'error_type': type(error).__name__,
            'context': context,
            'timestamp': timezone.now().isoformat()
        }
        
        logger.error(f"Payment Error: {json.dumps(error_response)}")
        
        return error_response
    
    def sanitize_response(self, response: Dict) -> Dict:
        """Remove sensitive data from response before returning to client"""
        sensitive_fields = ['api_key', 'secret_key', 'access_token', 'refresh_token', 'password']
        
        sanitized = response.copy()
        for field in sensitive_fields:
            if field in sanitized:
                sanitized[field] = '***REDACTED***'
        
        return sanitized
    
    def is_test_mode(self) -> bool:
        """Check if running in test/sandbox mode"""
        return getattr(settings, 'PAYMENT_TEST_MODE', True)
    
    def get_callback_url(self, reference: str) -> str:
        """Generate callback URL for webhooks"""
        base_url = settings.PAYMENT_CALLBACK_BASE_URL
        return f"{base_url}/api/payments/webhook/{self.provider_name}/{reference}/"
    
    def validate_amount(self, amount: Decimal, currency: str) -> Tuple[bool, str]:
        """Validate payment amount"""
        if amount <= 0:
            return False, "Amount must be greater than zero"
        
        # Check minimum amounts per currency
        min_amounts = {
            'USD': Decimal('1.00'),
            'EUR': Decimal('1.00'),
            'GBP': Decimal('1.00'),
            'KES': Decimal('100.00'),
            'UGX': Decimal('1000.00'),
            'TZS': Decimal('1000.00'),
            'NGN': Decimal('100.00'),
            'ZAR': Decimal('10.00'),
        }
        
        min_amount = min_amounts.get(currency, Decimal('1.00'))
        if amount < min_amount:
            return False, f"Minimum amount for {currency} is {min_amount}"
        
        # Check maximum amounts
        max_amount = Decimal('1000000.00')  # Default max
        if amount > max_amount:
            return False, f"Maximum amount exceeded"
        
        return True, "Valid"
    
    def format_amount(self, amount: Decimal, currency: str) -> str:
        """Format amount for display"""
        return f"{currency} {amount:,.2f}"