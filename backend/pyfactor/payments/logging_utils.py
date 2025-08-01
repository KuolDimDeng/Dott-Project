# payments/logging_utils.py - Comprehensive Debug Logging Utilities
import logging
import json
import traceback
from typing import Dict, Any, Optional
from datetime import datetime
from django.conf import settings

# Configure payment-specific logger
logger = logging.getLogger('payments')

class PaymentLogger:
    """Enhanced payment system logger with structured logging"""
    
    def __init__(self, component_name: str):
        self.component_name = component_name
        self.logger = logging.getLogger(f'payments.{component_name.lower()}')
    
    def debug_start(self, operation: str, context: Dict[str, Any] = None):
        """Log the start of an operation"""
        self.logger.debug(f"🎯 [{self.component_name}] === {operation} START ===", extra={
            'operation': operation,
            'component': self.component_name,
            'context': context or {},
            'timestamp': datetime.now().isoformat()
        })
    
    def debug_end(self, operation: str, success: bool = True, context: Dict[str, Any] = None):
        """Log the end of an operation"""
        status = "SUCCESS" if success else "FAILURE"
        self.logger.debug(f"🎯 [{self.component_name}] === {operation} {status} ===", extra={
            'operation': operation,
            'component': self.component_name,
            'success': success,
            'context': context or {},
            'timestamp': datetime.now().isoformat()
        })
    
    def debug_step(self, operation: str, step: str, data: Dict[str, Any] = None):
        """Log a step within an operation"""
        self.logger.debug(f"🎯 [{self.component_name}] {operation} - {step}", extra={
            'operation': operation,
            'step': step,
            'component': self.component_name,
            'data': data or {},
            'timestamp': datetime.now().isoformat()
        })
    
    def debug_api_request(self, method: str, url: str, headers: Dict = None, payload: Dict = None):
        """Log API request details"""
        # Sanitize sensitive data
        safe_headers = self._sanitize_headers(headers or {})
        safe_payload = self._sanitize_payload(payload or {})
        
        self.logger.debug(f"🎯 [{self.component_name}] API Request: {method} {url}", extra={
            'api_method': method,
            'api_url': url,
            'headers': safe_headers,
            'payload': safe_payload,
            'component': self.component_name,
            'timestamp': datetime.now().isoformat()
        })
    
    def debug_api_response(self, status_code: int, response_data: Dict = None, duration_ms: int = None):
        """Log API response details"""
        safe_response = self._sanitize_payload(response_data or {})
        
        self.logger.debug(f"🎯 [{self.component_name}] API Response: {status_code}", extra={
            'status_code': status_code,
            'response_data': safe_response,
            'duration_ms': duration_ms,
            'component': self.component_name,
            'timestamp': datetime.now().isoformat()
        })
    
    def debug_transaction_flow(self, transaction_id: str, status: str, details: Dict[str, Any] = None):
        """Log transaction flow updates"""
        self.logger.debug(f"🎯 [{self.component_name}] Transaction {transaction_id}: {status}", extra={
            'transaction_id': transaction_id,
            'transaction_status': status,
            'details': details or {},
            'component': self.component_name,
            'timestamp': datetime.now().isoformat()
        })
    
    def debug_webhook_processing(self, gateway: str, event_type: str, event_id: str, status: str):
        """Log webhook processing details"""
        self.logger.debug(f"🎯 [{self.component_name}] Webhook {gateway} {event_type}: {status}", extra={
            'gateway': gateway,
            'event_type': event_type,
            'event_id': event_id,
            'webhook_status': status,
            'component': self.component_name,
            'timestamp': datetime.now().isoformat()
        })
    
    def debug_security_event(self, event_type: str, details: Dict[str, Any], risk_level: str = 'medium'):
        """Log security-related events"""
        self.logger.warning(f"🔒 [{self.component_name}] Security Event: {event_type}", extra={
            'security_event': event_type,
            'risk_level': risk_level,
            'details': details,
            'component': self.component_name,
            'timestamp': datetime.now().isoformat()
        })
    
    def debug_performance(self, operation: str, duration_ms: int, details: Dict[str, Any] = None):
        """Log performance metrics"""
        self.logger.debug(f"⏱️ [{self.component_name}] Performance {operation}: {duration_ms}ms", extra={
            'operation': operation,
            'duration_ms': duration_ms,
            'performance_details': details or {},
            'component': self.component_name,
            'timestamp': datetime.now().isoformat()
        })
    
    def error(self, message: str, exception: Exception = None, context: Dict[str, Any] = None):
        """Log error with full context"""
        error_data = {
            'component': self.component_name,
            'context': context or {},
            'timestamp': datetime.now().isoformat()
        }
        
        if exception:
            error_data.update({
                'exception_type': type(exception).__name__,
                'exception_message': str(exception),
                'traceback': traceback.format_exc()
            })
        
        self.logger.error(f"❌ [{self.component_name}] {message}", extra=error_data, exc_info=exception)
    
    def warning(self, message: str, context: Dict[str, Any] = None):
        """Log warning with context"""
        self.logger.warning(f"⚠️ [{self.component_name}] {message}", extra={
            'component': self.component_name,
            'context': context or {},
            'timestamp': datetime.now().isoformat()
        })
    
    def info(self, message: str, context: Dict[str, Any] = None):
        """Log info with context"""
        self.logger.info(f"ℹ️ [{self.component_name}] {message}", extra={
            'component': self.component_name,
            'context': context or {},
            'timestamp': datetime.now().isoformat()
        })
    
    def _sanitize_headers(self, headers: Dict) -> Dict:
        """Remove sensitive data from headers"""
        sensitive_headers = [
            'authorization', 'x-api-key', 'x-auth-token', 'cookie',
            'x-stripe-signature', 'verif-hash', 'x-webhook-signature'
        ]
        
        sanitized = {}
        for key, value in headers.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_headers):
                sanitized[key] = '[REDACTED]'
            else:
                sanitized[key] = value
        
        return sanitized
    
    def _sanitize_payload(self, payload: Dict) -> Dict:
        """Remove sensitive data from payload"""
        if not isinstance(payload, dict):
            return payload
        
        sensitive_fields = [
            'password', 'token', 'secret', 'key', 'card_number', 'cvv',
            'account_number', 'routing_number', 'ssn', 'social_security_number',
            'pin', 'otp', 'verification_code', 'signature', 'private_key'
        ]
        
        sanitized = {}
        for key, value in payload.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_fields):
                if isinstance(value, str) and len(value) > 4:
                    sanitized[key] = f"{'*' * (len(value) - 4)}{value[-4:]}"
                else:
                    sanitized[key] = '[REDACTED]'
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_payload(value)
            elif isinstance(value, list):
                sanitized[key] = [self._sanitize_payload(item) if isinstance(item, dict) else item for item in value]
            else:
                sanitized[key] = value
        
        return sanitized

# Enhanced logging configuration
PAYMENT_LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'payment_detailed': {
            'format': '{asctime} [{levelname}] {name} - {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S'
        },
        'payment_json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s %(component)s %(operation)s'
        }
    },
    'handlers': {
        'payment_file': {
            'level': 'DEBUG',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/payments.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'payment_detailed'
        },
        'payment_json_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/payments_structured.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'payment_json'
        },
        'payment_console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'payment_detailed'
        }
    },
    'loggers': {
        'payments': {
            'level': 'DEBUG',
            'handlers': ['payment_file', 'payment_console'],
            'propagate': False
        },
        'payments.api': {
            'level': 'DEBUG',
            'handlers': ['payment_file', 'payment_json_file'],
            'propagate': False
        },
        'payments.webhooks': {
            'level': 'DEBUG',
            'handlers': ['payment_file', 'payment_json_file'],
            'propagate': False
        },
        'payments.processors': {
            'level': 'DEBUG',
            'handlers': ['payment_file', 'payment_json_file'],
            'propagate': False
        },
        'payments.security': {
            'level': 'WARNING',
            'handlers': ['payment_file', 'payment_json_file'],
            'propagate': False
        }
    }
}

# Context managers for enhanced logging
class PaymentOperation:
    """Context manager for logging payment operations"""
    
    def __init__(self, logger: PaymentLogger, operation_name: str, context: Dict[str, Any] = None):
        self.logger = logger
        self.operation_name = operation_name
        self.context = context or {}
        self.start_time = None
    
    def __enter__(self):
        self.start_time = datetime.now()
        self.logger.debug_start(self.operation_name, self.context)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = int((datetime.now() - self.start_time).total_seconds() * 1000)
        success = exc_type is None
        
        end_context = {**self.context, 'duration_ms': duration_ms}
        
        if not success and exc_val:
            self.logger.error(f"Operation {self.operation_name} failed", exc_val, end_context)
        
        self.logger.debug_end(self.operation_name, success, end_context)
        self.logger.debug_performance(self.operation_name, duration_ms, end_context)

# Decorator for automatic operation logging
def log_payment_operation(operation_name: str = None):
    """Decorator to automatically log payment operations"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Try to get component name from class
            component_name = 'Unknown'
            if args and hasattr(args[0], '__class__'):
                component_name = args[0].__class__.__name__
            
            logger = PaymentLogger(component_name)
            op_name = operation_name or func.__name__
            
            context = {
                'function': func.__name__,
                'args_count': len(args),
                'kwargs_keys': list(kwargs.keys())
            }
            
            with PaymentOperation(logger, op_name, context):
                return func(*args, **kwargs)
        
        return wrapper
    return decorator

# Utility functions for debug logging
def log_payment_request(component: str, request_data: Dict[str, Any]):
    """Log payment request with sanitization"""
    logger = PaymentLogger(component)
    logger.debug_step('payment_request', 'received', {
        'amount': request_data.get('amount'),
        'currency': request_data.get('currency'),
        'gateway': request_data.get('gateway_name'),
        'method_type': request_data.get('method_type'),
        'user_id': request_data.get('user_id')
    })

def log_payment_response(component: str, success: bool, response_data: Dict[str, Any]):
    """Log payment response with sanitization"""
    logger = PaymentLogger(component)
    status = 'success' if success else 'failure'
    logger.debug_step('payment_response', status, {
        'transaction_id': response_data.get('transaction_id'),
        'gateway_transaction_id': response_data.get('gateway_transaction_id'),
        'status': response_data.get('status'),
        'requires_action': response_data.get('requires_action'),
        'error_code': response_data.get('error_code')
    })

def log_webhook_event(component: str, gateway: str, event_data: Dict[str, Any]):
    """Log webhook event processing"""
    logger = PaymentLogger(component)
    logger.debug_webhook_processing(
        gateway=gateway,
        event_type=event_data.get('event_type', 'unknown'),
        event_id=event_data.get('event_id', 'unknown'),
        status='processing'
    )

def log_security_event(component: str, event_type: str, details: Dict[str, Any], risk_level: str = 'medium'):
    """Log security events"""
    logger = PaymentLogger(component)
    logger.debug_security_event(event_type, details, risk_level)

# Initialize logging configuration if needed
def setup_payment_logging():
    """Setup payment-specific logging configuration"""
    import logging.config
    import os
    
    # Create logs directory if it doesn't exist
    logs_dir = 'logs'
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)
    
    # Apply logging configuration
    logging.config.dictConfig(PAYMENT_LOGGING_CONFIG)
    
    # Test logging setup
    test_logger = PaymentLogger('Setup')
    test_logger.info('Payment logging configuration initialized')

# Export commonly used loggers
payment_api_logger = PaymentLogger('API')
payment_webhook_logger = PaymentLogger('Webhooks')
payment_processor_logger = PaymentLogger('Processors')
payment_security_logger = PaymentLogger('Security')