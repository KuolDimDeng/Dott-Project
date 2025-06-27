"""
Custom exceptions for POS operations.
Provides specific error types for different POS scenarios.
"""

from rest_framework import status
from rest_framework.views import exception_handler
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from pyfactor.logging_config import get_logger

logger = get_logger()


class POSException(Exception):
    """Base exception for POS operations"""
    default_message = "POS operation failed"
    status_code = status.HTTP_400_BAD_REQUEST
    
    def __init__(self, message=None, details=None, status_code=None):
        self.message = message or self.default_message
        self.details = details or {}
        self.status_code = status_code or self.status_code
        super().__init__(self.message)


class InsufficientStockException(POSException):
    """Raised when there's insufficient stock for a product"""
    default_message = "Insufficient stock for one or more products"
    status_code = status.HTTP_409_CONFLICT
    
    def __init__(self, stock_errors, message=None):
        self.stock_errors = stock_errors
        super().__init__(message, {'stock_errors': stock_errors})


class PaymentValidationException(POSException):
    """Raised when payment validation fails"""
    default_message = "Payment validation failed"
    status_code = status.HTTP_400_BAD_REQUEST


class ProductNotFoundException(POSException):
    """Raised when a product is not found"""
    default_message = "Product not found"
    status_code = status.HTTP_404_NOT_FOUND


class ServiceNotFoundException(POSException):
    """Raised when a service is not found"""
    default_message = "Service not found"
    status_code = status.HTTP_404_NOT_FOUND


class CustomerNotFoundException(POSException):
    """Raised when a customer is not found"""
    default_message = "Customer not found"
    status_code = status.HTTP_404_NOT_FOUND


class TransactionNotFoundException(POSException):
    """Raised when a transaction is not found"""
    default_message = "Transaction not found"
    status_code = status.HTTP_404_NOT_FOUND


class TransactionAlreadyVoidedException(POSException):
    """Raised when trying to void an already voided transaction"""
    default_message = "Transaction is already voided"
    status_code = status.HTTP_409_CONFLICT


class RefundValidationException(POSException):
    """Raised when refund validation fails"""
    default_message = "Refund validation failed"
    status_code = status.HTTP_400_BAD_REQUEST


class AccountingException(POSException):
    """Raised when accounting operations fail"""
    default_message = "Accounting operation failed"
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR


class InventoryException(POSException):
    """Raised when inventory operations fail"""
    default_message = "Inventory operation failed"
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR


def custom_exception_handler(exc, context):
    """
    Custom exception handler for POS operations.
    Provides structured error responses.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Handle custom POS exceptions
    if isinstance(exc, POSException):
        custom_response_data = {
            'error': {
                'type': exc.__class__.__name__,
                'message': exc.message,
                'details': exc.details,
                'timestamp': context['request'].META.get('HTTP_X_TIMESTAMP'),
                'path': context['request'].path
            }
        }
        
        # Log the error
        logger.error(f"POS Exception: {exc.__class__.__name__}: {exc.message}, Details: {exc.details}")
        
        return Response(custom_response_data, status=exc.status_code)
    
    # Handle Django validation errors
    elif isinstance(exc, ValidationError):
        custom_response_data = {
            'error': {
                'type': 'ValidationError',
                'message': 'Validation failed',
                'details': {
                    'validation_errors': exc.message_dict if hasattr(exc, 'message_dict') else [str(exc)]
                },
                'timestamp': context['request'].META.get('HTTP_X_TIMESTAMP'),
                'path': context['request'].path
            }
        }
        
        logger.error(f"Validation Error: {str(exc)}")
        
        return Response(custom_response_data, status=status.HTTP_400_BAD_REQUEST)
    
    # Enhance default DRF error responses
    if response is not None:
        custom_response_data = {
            'error': {
                'type': 'APIError',
                'message': 'API request failed',
                'details': response.data,
                'timestamp': context['request'].META.get('HTTP_X_TIMESTAMP'),
                'path': context['request'].path
            }
        }
        response.data = custom_response_data
    
    return response


class POSErrorCodes:
    """
    Standard error codes for POS operations.
    Use these for consistent error identification.
    """
    
    # Stock related errors
    INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK"
    PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND"
    PRODUCT_INACTIVE = "PRODUCT_INACTIVE"
    
    # Payment related errors
    INVALID_PAYMENT_METHOD = "INVALID_PAYMENT_METHOD"
    INSUFFICIENT_PAYMENT = "INSUFFICIENT_PAYMENT"
    PAYMENT_PROCESSING_FAILED = "PAYMENT_PROCESSING_FAILED"
    
    # Transaction related errors
    TRANSACTION_NOT_FOUND = "TRANSACTION_NOT_FOUND"
    TRANSACTION_ALREADY_VOIDED = "TRANSACTION_ALREADY_VOIDED"
    TRANSACTION_CANNOT_BE_VOIDED = "TRANSACTION_CANNOT_BE_VOIDED"
    
    # Customer related errors
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    CUSTOMER_INACTIVE = "CUSTOMER_INACTIVE"
    
    # Refund related errors
    REFUND_AMOUNT_EXCEEDED = "REFUND_AMOUNT_EXCEEDED"
    REFUND_QUANTITY_EXCEEDED = "REFUND_QUANTITY_EXCEEDED"
    ORIGINAL_TRANSACTION_NOT_FOUND = "ORIGINAL_TRANSACTION_NOT_FOUND"
    
    # Accounting related errors
    JOURNAL_ENTRY_FAILED = "JOURNAL_ENTRY_FAILED"
    ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND"
    ACCOUNTING_PERIOD_CLOSED = "ACCOUNTING_PERIOD_CLOSED"
    
    # System related errors
    DATABASE_ERROR = "DATABASE_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    CONCURRENCY_ERROR = "CONCURRENCY_ERROR"


def create_error_response(error_code, message, details=None, status_code=status.HTTP_400_BAD_REQUEST):
    """
    Helper function to create standardized error responses.
    
    Args:
        error_code: Error code from POSErrorCodes
        message: Human-readable error message
        details: Additional error details
        status_code: HTTP status code
        
    Returns:
        Response object with standardized error format
    """
    error_data = {
        'error': {
            'code': error_code,
            'message': message,
            'details': details or {},
            'timestamp': None,  # Will be set by the view
        }
    }
    
    return Response(error_data, status=status_code)


class POSValidationMixin:
    """
    Mixin providing common validation methods for POS operations.
    """
    
    def validate_stock_availability(self, items):
        """Validate stock availability for products"""
        stock_errors = []
        
        for item in items:
            if item.get('type') == 'product':
                product = item.get('item')
                requested_qty = item.get('quantity', 0)
                
                if hasattr(product, 'quantity'):
                    available_qty = product.quantity or 0
                    if available_qty < requested_qty:
                        stock_errors.append({
                            'product_id': str(product.id),
                            'product_name': product.name,
                            'available': available_qty,
                            'requested': requested_qty
                        })
        
        if stock_errors:
            raise InsufficientStockException(stock_errors)
    
    def validate_payment_amount(self, payment_method, amount_tendered, total_amount):
        """Validate payment amount is sufficient"""
        if payment_method == 'cash':
            if not amount_tendered or amount_tendered < total_amount:
                raise PaymentValidationException(
                    "Insufficient cash tendered",
                    details={
                        'amount_tendered': str(amount_tendered or 0),
                        'total_amount': str(total_amount),
                        'shortage': str(total_amount - (amount_tendered or 0))
                    }
                )
    
    def validate_refund_eligibility(self, original_transaction, refund_items):
        """Validate refund eligibility"""
        if original_transaction.status == 'voided':
            raise RefundValidationException(
                "Cannot refund a voided transaction",
                details={'original_transaction': original_transaction.transaction_number}
            )
        
        # Check refund amounts don't exceed original amounts
        for refund_item in refund_items:
            original_item = refund_item.get('original_item')
            quantity_to_refund = refund_item.get('quantity_returned', 0)
            
            if quantity_to_refund > original_item.quantity:
                raise RefundValidationException(
                    f"Refund quantity exceeds original quantity for {original_item.item_name}",
                    details={
                        'item_name': original_item.item_name,
                        'original_quantity': str(original_item.quantity),
                        'refund_quantity': str(quantity_to_refund)
                    }
                )