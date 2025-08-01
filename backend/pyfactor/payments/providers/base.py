# payments/providers/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from decimal import Decimal
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

class PaymentProcessorResult:
    """Standardized result object for payment processing"""
    
    def __init__(self, success: bool, transaction_id: str = None, 
                 gateway_response: Dict = None, error_message: str = None, 
                 error_code: str = None, requires_action: bool = False,
                 action_data: Dict = None):
        self.success = success
        self.transaction_id = transaction_id
        self.gateway_response = gateway_response or {}
        self.error_message = error_message
        self.error_code = error_code
        self.requires_action = requires_action
        self.action_data = action_data or {}
        self.processed_at = timezone.now()

class PaymentProcessor(ABC):
    """Enhanced base class for payment processors with comprehensive functionality"""
    
    def __init__(self, gateway_config: Dict[str, Any]):
        self.config = gateway_config
        self.gateway_name = gateway_config.get('name', 'Unknown')
        self.api_key = gateway_config.get('api_key')
        self.secret_key = gateway_config.get('secret_key')
        self.webhook_secret = gateway_config.get('webhook_secret')
        self.base_url = gateway_config.get('base_url')
        self.is_sandbox = gateway_config.get('is_sandbox', False)
    
    # Core payment processing methods
    @abstractmethod
    def process_payment(self, transaction, payment_method=None) -> PaymentProcessorResult:
        """Process a payment transaction"""
        pass
    
    @abstractmethod
    def process_payout(self, transaction, payment_method) -> PaymentProcessorResult:
        """Process a payout to a recipient"""
        pass
    
    @abstractmethod
    def process_refund(self, original_transaction, refund_amount: Decimal, 
                      reason: str = None) -> PaymentProcessorResult:
        """Process a refund for a transaction"""
        pass
    
    # Payment method management
    @abstractmethod
    def add_payment_method(self, user, method_data: Dict) -> PaymentProcessorResult:
        """Add a new payment method for a user"""
        pass
    
    @abstractmethod
    def verify_payment_method(self, payment_method, verification_data: Dict) -> PaymentProcessorResult:
        """Verify a payment method (micro-deposits, SMS, etc.)"""
        pass
    
    @abstractmethod
    def remove_payment_method(self, payment_method) -> PaymentProcessorResult:
        """Remove a payment method"""
        pass
    
    # Webhook handling
    @abstractmethod
    def verify_webhook_signature(self, payload: str, signature: str, headers: Dict) -> bool:
        """Verify webhook signature for security"""
        pass
    
    @abstractmethod
    def process_webhook(self, event_type: str, payload: Dict) -> PaymentProcessorResult:
        """Process webhook events"""
        pass
    
    # Information and validation methods
    @abstractmethod
    def get_transaction_status(self, gateway_transaction_id: str) -> PaymentProcessorResult:
        """Get current status of a transaction from the gateway"""
        pass
    
    @abstractmethod
    def get_supported_currencies(self) -> list:
        """Get list of supported currencies"""
        pass
    
    @abstractmethod
    def get_supported_countries(self) -> list:
        """Get list of supported countries"""
        pass
    
    @abstractmethod
    def validate_credentials(self) -> bool:
        """Validate API credentials"""
        pass
    
    @abstractmethod
    def calculate_fees(self, amount: Decimal, currency: str = 'USD') -> Dict[str, Decimal]:
        """Calculate processing fees for an amount"""
        pass
    
    # Utility methods
    def log_debug(self, message: str, extra_data: Dict = None):
        """Standardized debug logging"""
        log_data = {
            'gateway': self.gateway_name,
            'sandbox': self.is_sandbox,
            **(extra_data or {})
        }
        logger.debug(f"🎯 [{self.gateway_name}] {message}", extra=log_data)
    
    def log_error(self, message: str, error: Exception = None, extra_data: Dict = None):
        """Standardized error logging"""
        log_data = {
            'gateway': self.gateway_name,
            'sandbox': self.is_sandbox,
            'error': str(error) if error else None,
            **(extra_data or {})
        }
        logger.error(f"🎯 [{self.gateway_name}] {message}", extra=log_data, exc_info=error)
    
    def create_error_result(self, message: str, code: str = None, 
                           gateway_response: Dict = None) -> PaymentProcessorResult:
        """Create standardized error result"""
        return PaymentProcessorResult(
            success=False,
            error_message=message,
            error_code=code,
            gateway_response=gateway_response or {}
        )
    
    def create_success_result(self, transaction_id: str, 
                             gateway_response: Dict = None,
                             requires_action: bool = False,
                             action_data: Dict = None) -> PaymentProcessorResult:
        """Create standardized success result"""
        return PaymentProcessorResult(
            success=True,
            transaction_id=transaction_id,
            gateway_response=gateway_response or {},
            requires_action=requires_action,
            action_data=action_data or {}
        )
    
    # Legacy methods for backward compatibility
    def process_payroll_payment(self, employee, amount, currency, metadata=None):
        """Legacy method - use process_payout instead"""
        # This will be implemented by subclasses for backward compatibility
        raise NotImplementedError("Use process_payout method instead")
    
    def process_tax_payment(self, tax_authority, amount, currency, metadata=None):
        """Legacy method - use process_payment instead"""
        # This will be implemented by subclasses for backward compatibility
        raise NotImplementedError("Use process_payment method instead")
    
    def get_employee_account_form(self):
        """Legacy method - implement in subclasses as needed"""
        return []
    
    def validate_account_details(self, details):
        """Legacy method - implement in subclasses as needed"""
        return True