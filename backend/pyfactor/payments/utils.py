# payments/utils.py - Payment Processing Utilities
import uuid
import logging
import hashlib
import hmac
from decimal import Decimal
from typing import Dict, Any, Optional, Union
from datetime import datetime, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache

from .models import PaymentGateway, PaymentAuditLog, Transaction

logger = logging.getLogger(__name__)
User = get_user_model()

class PaymentProcessorFactory:
    """Factory class for creating payment processor instances"""
    
    _processors = {}
    
    @classmethod
    def get_processor(cls, gateway: PaymentGateway):
        """Get processor instance for a gateway"""
        logger.debug(f"🎯 [PaymentProcessorFactory] Creating processor for: {gateway.name}")
        
        # Check cache first
        cache_key = f"payment_processor_{gateway.id}"
        processor = cache.get(cache_key)
        
        if processor:
            logger.debug(f"🎯 [PaymentProcessorFactory] Using cached processor")
            return processor
        
        # Create new processor instance
        gateway_config = {
            'api_key': gateway.get_api_key(),
            'secret_key': gateway.get_secret_key(),
            'webhook_secret': gateway.get_webhook_secret(),
            'config': gateway.get_config(),
            'is_sandbox': gateway.status == 'sandbox',
            'callback_url': getattr(settings, 'PAYMENT_CALLBACK_URL', ''),
            'webhook_url': gateway.webhook_url
        }
        
        if gateway.name.upper() == 'STRIPE':
            from .providers.stripe_enhanced import StripeProcessor
            processor = StripeProcessor(gateway_config)
        elif gateway.name.upper() == 'MPESA':
            from .providers.mpesa_enhanced import MPesaProcessor
            processor = MPesaProcessor(gateway_config)
        elif gateway.name.upper() == 'FLUTTERWAVE':
            from .providers.flutterwave_enhanced import FlutterwaveProcessor
            processor = FlutterwaveProcessor(gateway_config)
        elif gateway.name.upper() == 'BANK_TRANSFER':
            from .providers.bank_transfer import BankTransferProcessor
            processor = BankTransferProcessor(gateway_config)
        else:
            raise ValueError(f"Unsupported payment gateway: {gateway.name}")
        
        # Cache processor for 1 hour
        cache.set(cache_key, processor, 3600)
        
        logger.debug(f"🎯 [PaymentProcessorFactory] Created and cached {gateway.name} processor")
        return processor

def generate_transaction_reference(prefix: str = 'TXN') -> str:
    """Generate unique transaction reference number"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    unique_id = str(uuid.uuid4())[:8].upper()
    return f"{prefix}_{timestamp}_{unique_id}"

def get_client_ip(request) -> str:
    """Get client IP address from request"""
    # Check for forwarded headers (behind proxy/load balancer)
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        # Take the first IP in the chain
        return forwarded_for.split(',')[0].strip()
    
    # Check for real IP header
    real_ip = request.META.get('HTTP_X_REAL_IP')
    if real_ip:
        return real_ip
    
    # Fallback to remote address
    return request.META.get('REMOTE_ADDR', '127.0.0.1')

def create_audit_log(user: Optional[User] = None, 
                    action: str = '', 
                    description: str = '', 
                    risk_level: str = 'low',
                    gateway: Optional[PaymentGateway] = None,
                    transaction: Optional[Transaction] = None,
                    payment_method=None,
                    ip_address: str = '',
                    user_agent: str = '',
                    request_id: str = '',
                    metadata: Dict[str, Any] = None) -> PaymentAuditLog:
    """Create payment audit log entry"""
    logger.debug(f"🎯 [create_audit_log] Creating audit log: {action}")
    
    try:
        audit_log = PaymentAuditLog.objects.create(
            user=user,
            action=action,
            description=description,
            risk_level=risk_level,
            gateway=gateway,
            transaction=transaction,
            payment_method=payment_method,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id or str(uuid.uuid4()),
            metadata=metadata or {}
        )
        
        logger.debug(f"🎯 [create_audit_log] Audit log created: {audit_log.id}")
        return audit_log
        
    except Exception as e:
        logger.error(f"🎯 [create_audit_log] Failed to create audit log: {str(e)}", exc_info=True)
        # Don't let audit logging failure break the main flow
        return None

def calculate_platform_fees(amount: Decimal, 
                          gateway_name: str = '',
                          transaction_type: str = 'payment') -> Dict[str, Decimal]:
    """Calculate platform fees for transactions"""
    logger.debug(f"🎯 [calculate_platform_fees] Calculating fees for {amount} {gateway_name}")
    
    # Platform fee structure from CLAUDE.md [35.0.0]
    if transaction_type == 'payment':
        # Invoice/Vendor Payments: 2.9% + $0.60 (profit: $0.30/transaction)
        percentage_fee = Decimal('0.029')  # 2.9%
        fixed_fee = Decimal('0.60')
        platform_profit = Decimal('0.30')
    elif transaction_type == 'payout' and gateway_name.upper() == 'PAYROLL':
        # Payroll: 2.4% (configurable)
        percentage_fee = Decimal('0.024')  # 2.4%
        fixed_fee = Decimal('0')
        platform_profit = amount * percentage_fee  # Full amount is profit
    elif transaction_type == 'subscription':
        # Subscriptions: 2.5% (configurable)
        percentage_fee = Decimal('0.025')  # 2.5%
        fixed_fee = Decimal('0')
        platform_profit = amount * percentage_fee  # Full amount is profit
    else:
        # Default fee structure
        percentage_fee = Decimal('0.029')  # 2.9%
        fixed_fee = Decimal('0.30')
        platform_profit = Decimal('0.15')
    
    total_platform_fee = (amount * percentage_fee) + fixed_fee
    
    return {
        'percentage_fee': amount * percentage_fee,
        'fixed_fee': fixed_fee,
        'total_platform_fee': total_platform_fee,
        'platform_profit': platform_profit,
        'net_amount': amount - total_platform_fee
    }

def validate_currency_amount(amount: Union[str, Decimal, float], 
                           currency: str) -> tuple[bool, str, Decimal]:
    """Validate currency amount"""
    try:
        # Convert to Decimal for precision
        if isinstance(amount, str):
            decimal_amount = Decimal(amount)
        elif isinstance(amount, float):
            decimal_amount = Decimal(str(amount))
        else:
            decimal_amount = Decimal(amount)
        
        # Check for negative amounts
        if decimal_amount <= 0:
            return False, "Amount must be greater than zero", Decimal('0')
        
        # Currency-specific validations
        currency = currency.upper()
        
        # Check decimal places based on currency
        if currency in ['JPY', 'KRW', 'CLP', 'ISK']:
            # Zero decimal currencies
            if decimal_amount != decimal_amount.quantize(Decimal('1')):
                return False, f"Currency {currency} does not support decimal places", Decimal('0')
        else:
            # Standard 2 decimal place currencies
            if decimal_amount != decimal_amount.quantize(Decimal('0.01')):
                return False, f"Currency {currency} supports maximum 2 decimal places", Decimal('0')
        
        # Check amount limits (can be customized per currency)
        min_amount = Decimal('0.01') if currency not in ['JPY', 'KRW', 'CLP', 'ISK'] else Decimal('1')
        max_amount = Decimal('999999.99')
        
        if decimal_amount < min_amount:
            return False, f"Amount below minimum {min_amount} {currency}", Decimal('0')
        
        if decimal_amount > max_amount:
            return False, f"Amount exceeds maximum {max_amount} {currency}", Decimal('0')
        
        return True, "Amount is valid", decimal_amount
        
    except (ValueError, TypeError) as e:
        return False, f"Invalid amount format: {str(e)}", Decimal('0')

def format_currency_display(amount: Decimal, currency: str) -> str:
    """Format currency for display"""
    currency = currency.upper()
    
    # Currency symbols
    symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'NGN': '₦',
        'KES': 'KSh',
        'UGX': 'USh',
        'GHS': 'GH₵',
        'ZAR': 'R',
    }
    
    symbol = symbols.get(currency, currency + ' ')
    
    # Format based on decimal places
    if currency in ['JPY', 'KRW', 'CLP', 'ISK']:
        return f"{symbol}{amount:,.0f}"
    else:
        return f"{symbol}{amount:,.2f}"

def generate_webhook_signature(payload: str, secret: str, algorithm: str = 'sha256') -> str:
    """Generate webhook signature for verification"""
    if algorithm == 'sha256':
        signature = hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    elif algorithm == 'sha1':
        signature = hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha1
        ).hexdigest()
    else:
        raise ValueError(f"Unsupported signature algorithm: {algorithm}")
    
    return signature

def verify_webhook_signature(payload: str, 
                           signature: str, 
                           secret: str, 
                           algorithm: str = 'sha256',
                           signature_format: str = 'hex') -> bool:
    """Verify webhook signature"""
    try:
        expected_signature = generate_webhook_signature(payload, secret, algorithm)
        
        if signature_format == 'hex':
            return hmac.compare_digest(signature.lower(), expected_signature.lower())
        elif signature_format == 'base64':
            import base64
            signature_bytes = base64.b64decode(signature)
            expected_bytes = bytes.fromhex(expected_signature)
            return hmac.compare_digest(signature_bytes, expected_bytes)
        else:
            raise ValueError(f"Unsupported signature format: {signature_format}")
            
    except Exception as e:
        logger.error(f"Webhook signature verification error: {str(e)}")
        return False

def get_supported_payment_methods(gateway_name: str) -> list:
    """Get supported payment methods for a gateway"""
    methods_map = {
        'STRIPE': ['card', 'bank_account', 'ach', 'digital_wallet'],
        'FLUTTERWAVE': ['card', 'bank_account', 'mobile_money', 'ussd'],
        'MPESA': ['mobile_money'],
        'BANK_TRANSFER': ['bank_account', 'ach', 'wire']
    }
    
    return methods_map.get(gateway_name.upper(), [])

def calculate_processing_time_estimate(gateway_name: str, 
                                     method_type: str, 
                                     transaction_type: str = 'payment') -> timedelta:
    """Calculate estimated processing time"""
    # Base processing times (in minutes)
    processing_times = {
        'STRIPE': {
            'card': 1,  # Instant
            'bank_account': 2880,  # 2 days
            'ach': 4320,  # 3 days
        },
        'FLUTTERWAVE': {
            'card': 1,  # Instant
            'bank_account': 1440,  # 1 day
            'mobile_money': 5,  # 5 minutes
        },
        'MPESA': {
            'mobile_money': 2,  # 2 minutes
        },
        'BANK_TRANSFER': {
            'bank_account': 4320,  # 3 days (ACH)
            'ach': 4320,  # 3 days
            'wire': 240,  # 4 hours
        }
    }
    
    # Get base time
    gateway_times = processing_times.get(gateway_name.upper(), {})
    base_minutes = gateway_times.get(method_type, 1440)  # Default 1 day
    
    # Adjust for transaction type
    if transaction_type == 'payout':
        base_minutes *= 1.5  # Payouts typically take longer
    elif transaction_type == 'refund':
        base_minutes *= 2  # Refunds take longer
    
    return timedelta(minutes=int(base_minutes))

def mask_sensitive_data(data: str, visible_chars: int = 4, mask_char: str = '*') -> str:
    """Mask sensitive data showing only last few characters"""
    if not data or len(data) <= visible_chars:
        return mask_char * len(data) if data else ''
    
    masked_length = len(data) - visible_chars
    return (mask_char * masked_length) + data[-visible_chars:]

def validate_payment_method_data(method_type: str, data: Dict[str, Any]) -> tuple[bool, str]:
    """Validate payment method data based on type"""
    required_fields = {
        'bank_account': ['account_number', 'routing_number', 'account_holder_name'],
        'card': ['card_number', 'expiry_month', 'expiry_year', 'cvv'],
        'mobile_money': ['phone_number', 'provider'],
        'digital_wallet': ['email', 'wallet_type'],
        'ach': ['account_number', 'routing_number', 'account_holder_name'],
        'wire': ['account_number', 'swift_code', 'bank_name', 'account_holder_name']
    }
    
    required = required_fields.get(method_type, [])
    
    for field in required:
        if field not in data or not data[field]:
            return False, f"Missing required field: {field}"
    
    # Type-specific validations
    if method_type == 'card':
        # Validate card number (basic Luhn check)
        card_number = data['card_number'].replace(' ', '').replace('-', '')
        if not card_number.isdigit() or len(card_number) < 13 or len(card_number) > 19:
            return False, "Invalid card number format"
        
        # Validate expiry
        try:
            month = int(data['expiry_month'])
            year = int(data['expiry_year'])
            if month < 1 or month > 12:
                return False, "Invalid expiry month"
            if year < datetime.now().year or (year == datetime.now().year and month < datetime.now().month):
                return False, "Card has expired"
        except ValueError:
            return False, "Invalid expiry date format"
    
    elif method_type == 'bank_account':
        # Validate routing number (US format)
        routing = data['routing_number'].strip()
        if len(routing) != 9 or not routing.isdigit():
            return False, "Routing number must be 9 digits"
    
    elif method_type == 'mobile_money':
        # Validate phone number format
        phone = data['phone_number'].replace('+', '').replace('-', '').replace(' ', '')
        if not phone.isdigit() or len(phone) < 10:
            return False, "Invalid phone number format"
    
    return True, "Payment method data is valid"

def get_currency_info(currency: str) -> Dict[str, Any]:
    """Get currency information"""
    currency = currency.upper()
    
    currency_info = {
        'USD': {'symbol': '$', 'name': 'US Dollar', 'decimal_places': 2},
        'EUR': {'symbol': '€', 'name': 'Euro', 'decimal_places': 2},
        'GBP': {'symbol': '£', 'name': 'British Pound', 'decimal_places': 2},
        'JPY': {'symbol': '¥', 'name': 'Japanese Yen', 'decimal_places': 0},
        'NGN': {'symbol': '₦', 'name': 'Nigerian Naira', 'decimal_places': 2},
        'KES': {'symbol': 'KSh', 'name': 'Kenyan Shilling', 'decimal_places': 2},
        'UGX': {'symbol': 'USh', 'name': 'Ugandan Shilling', 'decimal_places': 0},
        'GHS': {'symbol': 'GH₵', 'name': 'Ghanaian Cedi', 'decimal_places': 2},
        'ZAR': {'symbol': 'R', 'name': 'South African Rand', 'decimal_places': 2},
    }
    
    return currency_info.get(currency, {
        'symbol': currency,
        'name': currency,
        'decimal_places': 2
    })

# Cache utility functions
def cache_gateway_config(gateway_id: str, config: Dict[str, Any], timeout: int = 3600):
    """Cache gateway configuration"""
    cache_key = f"gateway_config_{gateway_id}"
    cache.set(cache_key, config, timeout)

def get_cached_gateway_config(gateway_id: str) -> Optional[Dict[str, Any]]:
    """Get cached gateway configuration"""
    cache_key = f"gateway_config_{gateway_id}"
    return cache.get(cache_key)

def clear_gateway_cache(gateway_id: str):
    """Clear gateway cache"""
    cache_keys = [
        f"gateway_config_{gateway_id}",
        f"payment_processor_{gateway_id}"
    ]
    cache.delete_many(cache_keys)

# Fraud detection utilities
def calculate_fraud_score(transaction_data: Dict[str, Any]) -> int:
    """Calculate basic fraud score (0-100)"""
    score = 0
    
    # Amount-based scoring
    amount = transaction_data.get('amount', 0)
    if amount > 10000:
        score += 20
    elif amount > 5000:
        score += 10
    elif amount > 1000:
        score += 5
    
    # Velocity checks (if available)
    user_id = transaction_data.get('user_id')
    if user_id:
        # Check recent transaction count
        recent_count = Transaction.objects.filter(
            user_id=user_id,
            created_at__gte=timezone.now() - timedelta(hours=1)
        ).count()
        
        if recent_count > 10:
            score += 30
        elif recent_count > 5:
            score += 15
    
    # Geographic risk (basic IP-based)
    ip_address = transaction_data.get('ip_address', '')
    if ip_address:
        # This would normally use a GeoIP service
        # For now, just check for common VPN/proxy indicators
        suspicious_ips = ['127.0.0.1', '10.0.0.1']  # Placeholder
        if ip_address in suspicious_ips:
            score += 25
    
    return min(score, 100)  # Cap at 100

# Utility constants
SUPPORTED_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NGN', 'KES', 
    'UGX', 'TZS', 'GHS', 'ZAR', 'XAF', 'XOF', 'EGP', 'MAD'
]

SUPPORTED_COUNTRIES = [
    'US', 'CA', 'GB', 'DE', 'FR', 'AU', 'NG', 'KE', 'UG', 
    'TZ', 'GH', 'ZA', 'EG', 'MA', 'SN', 'CI', 'BF', 'ML'
]

PAYMENT_METHOD_TYPES = [
    'bank_account', 'card', 'mobile_money', 'digital_wallet', 
    'ach', 'wire', 'check', 'cash'
]

TRANSACTION_STATUSES = [
    'pending', 'processing', 'requires_action', 'completed', 
    'failed', 'cancelled', 'refunded', 'expired'
]

# Error code constants
ERROR_CODES = {
    'insufficient_funds': 'INSUFFICIENT_FUNDS',
    'invalid_card': 'INVALID_CARD',
    'expired_card': 'EXPIRED_CARD',
    'declined': 'DECLINED',
    'network_error': 'NETWORK_ERROR',
    'internal_error': 'INTERNAL_ERROR',
    'invalid_amount': 'INVALID_AMOUNT',
    'unsupported_currency': 'UNSUPPORTED_CURRENCY',
    'authentication_failed': 'AUTHENTICATION_FAILED',
    'rate_limit_exceeded': 'RATE_LIMIT_EXCEEDED'
}