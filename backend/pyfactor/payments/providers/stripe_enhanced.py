# payments/providers/stripe_enhanced.py
import stripe
import hmac
import hashlib
import json
from decimal import Decimal
from typing import Dict, Any
from django.conf import settings
from .base import PaymentProcessor, PaymentProcessorResult

class StripeProcessor(PaymentProcessor):
    """Enhanced Stripe payment processor with comprehensive functionality"""
    
    def __init__(self, gateway_config: Dict[str, Any]):
        super().__init__(gateway_config)
        
        # Initialize Stripe with API key
        stripe.api_key = self.secret_key or settings.STRIPE_SECRET_KEY
        
        # Stripe-specific configuration
        self.webhook_endpoint_secret = gateway_config.get('webhook_endpoint_secret')
        self.connect_account_id = gateway_config.get('connect_account_id')
        
        self.log_debug("Stripe processor initialized", {
            'sandbox': self.is_sandbox,
            'has_connect_account': bool(self.connect_account_id)
        })
    
    def process_payment(self, transaction, payment_method=None) -> PaymentProcessorResult:
        """Process a payment using Stripe"""
        self.log_debug("Processing payment", {
            'transaction_id': str(transaction.id),
            'amount': str(transaction.amount),
            'currency': transaction.currency
        })
        
        try:
            # Prepare payment intent data
            intent_data = {
                'amount': int(transaction.amount * 100),  # Convert to cents
                'currency': transaction.currency.lower(),
                'metadata': {
                    'transaction_id': str(transaction.id),
                    'user_id': str(transaction.user.id),
                    'tenant_id': str(transaction.tenant_id) if transaction.tenant_id else '',
                    **transaction.metadata
                },
                'description': transaction.description[:1000] if transaction.description else f"Payment {transaction.reference_number}"
            }
            
            # Add payment method if provided
            if payment_method and hasattr(payment_method, 'provider_account_id') and payment_method.provider_account_id:
                intent_data['payment_method'] = payment_method.provider_account_id
                intent_data['confirmation_method'] = 'manual'
                intent_data['confirm'] = True
            
            # Add platform fee if using Connect
            if self.connect_account_id and hasattr(transaction, 'fee_amount') and transaction.fee_amount > 0:
                intent_data['application_fee_amount'] = int(transaction.fee_amount * 100)
                intent_data['on_behalf_of'] = self.connect_account_id
            
            # Create payment intent
            payment_intent = stripe.PaymentIntent.create(**intent_data)
            
            self.log_debug("Payment intent created", {
                'payment_intent_id': payment_intent.id,
                'status': payment_intent.status
            })
            
            # Handle different statuses
            if payment_intent.status == 'succeeded':
                return self.create_success_result(
                    transaction_id=payment_intent.id,
                    gateway_response=payment_intent.to_dict()
                )
            elif payment_intent.status == 'requires_action':
                return self.create_success_result(
                    transaction_id=payment_intent.id,
                    gateway_response=payment_intent.to_dict(),
                    requires_action=True,
                    action_data={
                        'client_secret': payment_intent.client_secret,
                        'next_action': payment_intent.next_action
                    }
                )
            elif payment_intent.status in ['requires_payment_method', 'requires_confirmation']:
                return self.create_success_result(
                    transaction_id=payment_intent.id,
                    gateway_response=payment_intent.to_dict(),
                    requires_action=True,
                    action_data={'client_secret': payment_intent.client_secret}
                )
            else:
                return self.create_error_result(
                    f"Payment intent in unexpected status: {payment_intent.status}",
                    code='unexpected_status',
                    gateway_response=payment_intent.to_dict()
                )
                
        except stripe.error.CardError as e:
            self.log_error("Card error", e, {'error_code': e.code})
            return self.create_error_result(
                e.user_message or str(e),
                code=e.code,
                gateway_response={'error': e.to_dict()}
            )
        except stripe.error.StripeError as e:
            self.log_error("Stripe error", e, {'error_type': type(e).__name__})
            return self.create_error_result(
                str(e),
                code=getattr(e, 'code', 'stripe_error'),
                gateway_response={'error': e.to_dict() if hasattr(e, 'to_dict') else str(e)}
            )
        except Exception as e:
            self.log_error("Unexpected error processing payment", e)
            return self.create_error_result(
                "An unexpected error occurred while processing the payment",
                code='internal_error'
            )
    
    def process_payout(self, transaction, payment_method) -> PaymentProcessorResult:
        """Process a payout using Stripe"""
        self.log_debug("Processing payout", {
            'transaction_id': str(transaction.id),
            'amount': str(transaction.amount),
            'currency': transaction.currency,
            'recipient': transaction.recipient_name
        })
        
        try:
            # Get recipient's Stripe account or payment method
            destination = None
            if hasattr(payment_method, 'provider_account_id') and payment_method.provider_account_id:
                destination = payment_method.provider_account_id
            elif transaction.recipient_type == 'employee':
                # Try to get employee's Stripe account
                try:
                    from hr.models import Employee
                    employee = Employee.objects.get(id=transaction.recipient_id)
                    if hasattr(employee, 'stripe_account_id') and employee.stripe_account_id:
                        destination = employee.stripe_account_id
                except (Employee.DoesNotExist, ImportError):
                    pass
            
            if not destination:
                return self.create_error_result(
                    "No Stripe destination account found for recipient",
                    code='no_destination_account'
                )
            
            # Create transfer
            transfer_data = {
                'amount': int(transaction.amount * 100),  # Convert to cents
                'currency': transaction.currency.lower(),
                'destination': destination,
                'metadata': {
                    'transaction_id': str(transaction.id),
                    'recipient_name': transaction.recipient_name,
                    'recipient_type': transaction.recipient_type,
                    **transaction.metadata
                },
                'description': transaction.description[:1000] if transaction.description else f"Payout {transaction.reference_number}"
            }
            
            transfer = stripe.Transfer.create(**transfer_data)
            
            self.log_debug("Transfer created", {
                'transfer_id': transfer.id,
                'destination': destination
            })
            
            return self.create_success_result(
                transaction_id=transfer.id,
                gateway_response=transfer.to_dict()
            )
            
        except stripe.error.StripeError as e:
            self.log_error("Stripe error processing payout", e)
            return self.create_error_result(
                str(e),
                code=getattr(e, 'code', 'stripe_error'),
                gateway_response={'error': e.to_dict() if hasattr(e, 'to_dict') else str(e)}
            )
        except Exception as e:
            self.log_error("Unexpected error processing payout", e)
            return self.create_error_result(
                "An unexpected error occurred while processing the payout",
                code='internal_error'
            )
    
    def process_refund(self, original_transaction, refund_amount: Decimal, 
                      reason: str = None) -> PaymentProcessorResult:
        """Process a refund using Stripe"""
        self.log_debug("Processing refund", {
            'original_transaction_id': str(original_transaction.id),
            'refund_amount': str(refund_amount),
            'reason': reason
        })
        
        try:
            # Get the original payment intent or charge
            gateway_transaction_id = original_transaction.gateway_transaction_id
            if not gateway_transaction_id:
                return self.create_error_result(
                    "No gateway transaction ID found for original transaction",
                    code='no_gateway_transaction_id'
                )
            
            # Create refund
            refund_data = {
                'amount': int(refund_amount * 100),  # Convert to cents
                'metadata': {
                    'original_transaction_id': str(original_transaction.id),
                    'reason': reason or 'Customer requested refund'
                },
                'reason': 'requested_by_customer'
            }
            
            # Check if it's a payment intent or charge
            if gateway_transaction_id.startswith('pi_'):
                refund_data['payment_intent'] = gateway_transaction_id
            else:
                refund_data['charge'] = gateway_transaction_id
            
            refund = stripe.Refund.create(**refund_data)
            
            self.log_debug("Refund created", {
                'refund_id': refund.id,
                'status': refund.status
            })
            
            return self.create_success_result(
                transaction_id=refund.id,
                gateway_response=refund.to_dict()
            )
            
        except stripe.error.StripeError as e:
            self.log_error("Stripe error processing refund", e)
            return self.create_error_result(
                str(e),
                code=getattr(e, 'code', 'stripe_error'),
                gateway_response={'error': e.to_dict() if hasattr(e, 'to_dict') else str(e)}
            )
        except Exception as e:
            self.log_error("Unexpected error processing refund", e)
            return self.create_error_result(
                "An unexpected error occurred while processing the refund",
                code='internal_error'
            )
    
    def add_payment_method(self, user, method_data: Dict) -> PaymentProcessorResult:
        """Add a payment method using Stripe"""
        self.log_debug("Adding payment method", {
            'user_id': str(user.id),
            'method_type': method_data.get('type')
        })
        
        try:
            # Create customer if doesn't exist
            customer_id = getattr(user, 'stripe_customer_id', None)
            if not customer_id:
                customer = stripe.Customer.create(
                    email=user.email,
                    metadata={'user_id': str(user.id)}
                )
                customer_id = customer.id
                
                # Save customer ID (this would need to be implemented in your User model)
                # user.stripe_customer_id = customer_id
                # user.save()
            
            # Create payment method based on type
            if method_data.get('type') == 'card':
                payment_method = stripe.PaymentMethod.create(
                    type='card',
                    card=method_data.get('card_data', {})
                )
            elif method_data.get('type') == 'us_bank_account':
                payment_method = stripe.PaymentMethod.create(
                    type='us_bank_account',
                    us_bank_account=method_data.get('bank_data', {})
                )
            else:
                return self.create_error_result(
                    f"Unsupported payment method type: {method_data.get('type')}",
                    code='unsupported_method_type'
                )
            
            # Attach to customer
            payment_method.attach(customer=customer_id)
            
            self.log_debug("Payment method added", {
                'payment_method_id': payment_method.id,
                'customer_id': customer_id
            })
            
            return self.create_success_result(
                transaction_id=payment_method.id,
                gateway_response=payment_method.to_dict()
            )
            
        except stripe.error.StripeError as e:
            self.log_error("Stripe error adding payment method", e)
            return self.create_error_result(
                str(e),
                code=getattr(e, 'code', 'stripe_error'),
                gateway_response={'error': e.to_dict() if hasattr(e, 'to_dict') else str(e)}
            )
        except Exception as e:
            self.log_error("Unexpected error adding payment method", e)
            return self.create_error_result(
                "An unexpected error occurred while adding the payment method",
                code='internal_error'
            )
    
    def verify_payment_method(self, payment_method, verification_data: Dict) -> PaymentProcessorResult:
        """Verify a payment method using Stripe"""
        try:
            if payment_method.method_type == 'us_bank_account':
                # Verify with micro-deposits
                amounts = verification_data.get('amounts', [])
                if not amounts or len(amounts) != 2:
                    return self.create_error_result(
                        "Two micro-deposit amounts are required for verification",
                        code='invalid_verification_amounts'
                    )
                
                stripe.PaymentMethod.verify(
                    payment_method.provider_account_id,
                    amounts=amounts
                )
            
            return self.create_success_result(
                transaction_id=payment_method.provider_account_id,
                gateway_response={'verified': True}
            )
            
        except stripe.error.StripeError as e:
            self.log_error("Stripe error verifying payment method", e)
            return self.create_error_result(
                str(e),
                code=getattr(e, 'code', 'stripe_error')
            )
        except Exception as e:
            self.log_error("Unexpected error verifying payment method", e)
            return self.create_error_result(
                "An unexpected error occurred while verifying the payment method",
                code='internal_error'
            )
    
    def remove_payment_method(self, payment_method) -> PaymentProcessorResult:
        """Remove a payment method from Stripe"""
        try:
            stripe.PaymentMethod.detach(payment_method.provider_account_id)
            
            return self.create_success_result(
                transaction_id=payment_method.provider_account_id,
                gateway_response={'removed': True}
            )
            
        except stripe.error.StripeError as e:
            self.log_error("Stripe error removing payment method", e)
            return self.create_error_result(
                str(e),
                code=getattr(e, 'code', 'stripe_error')
            )
        except Exception as e:
            self.log_error("Unexpected error removing payment method", e)
            return self.create_error_result(
                "An unexpected error occurred while removing the payment method",
                code='internal_error'
            )
    
    def verify_webhook_signature(self, payload: str, signature: str, headers: Dict) -> bool:
        """Verify Stripe webhook signature"""
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_endpoint_secret
            )
            return True
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            self.log_error("Webhook signature verification failed", e)
            return False
    
    def process_webhook(self, event_type: str, payload: Dict) -> PaymentProcessorResult:
        """Process Stripe webhook events"""
        self.log_debug("Processing webhook", {
            'event_type': event_type,
            'event_id': payload.get('id')
        })
        
        try:
            # Handle different event types
            if event_type == 'payment_intent.succeeded':
                return self._handle_payment_succeeded(payload)
            elif event_type == 'payment_intent.payment_failed':
                return self._handle_payment_failed(payload)
            elif event_type == 'transfer.created':
                return self._handle_transfer_created(payload)
            elif event_type == 'transfer.failed':
                return self._handle_transfer_failed(payload)
            else:
                self.log_debug(f"Unhandled webhook event type: {event_type}")
                return self.create_success_result(
                    transaction_id=payload.get('id', ''),
                    gateway_response={'message': 'Event acknowledged but not processed'}
                )
        
        except Exception as e:
            self.log_error("Error processing webhook", e)
            return self.create_error_result(
                "Failed to process webhook event",
                code='webhook_processing_error'
            )
    
    def _handle_payment_succeeded(self, payload: Dict) -> PaymentProcessorResult:
        """Handle successful payment webhook"""
        payment_intent = payload.get('data', {}).get('object', {})
        transaction_id = payment_intent.get('metadata', {}).get('transaction_id')
        
        if transaction_id:
            # Update transaction status in database
            try:
                from ..models import Transaction
                transaction = Transaction.objects.get(id=transaction_id)
                transaction.mark_as_completed(
                    gateway_transaction_id=payment_intent.get('id'),
                    gateway_response=payment_intent
                )
            except Transaction.DoesNotExist:
                self.log_error(f"Transaction {transaction_id} not found for webhook")
        
        return self.create_success_result(
            transaction_id=payment_intent.get('id'),
            gateway_response=payment_intent
        )
    
    def _handle_payment_failed(self, payload: Dict) -> PaymentProcessorResult:
        """Handle failed payment webhook"""
        payment_intent = payload.get('data', {}).get('object', {})
        transaction_id = payment_intent.get('metadata', {}).get('transaction_id')
        
        if transaction_id:
            # Update transaction status in database
            try:
                from ..models import Transaction
                transaction = Transaction.objects.get(id=transaction_id)
                last_error = payment_intent.get('last_payment_error', {})
                transaction.mark_as_failed(
                    error_message=last_error.get('message', 'Payment failed'),
                    error_code=last_error.get('code')
                )
            except Transaction.DoesNotExist:
                self.log_error(f"Transaction {transaction_id} not found for webhook")
        
        return self.create_success_result(
            transaction_id=payment_intent.get('id'),
            gateway_response=payment_intent
        )
    
    def _handle_transfer_created(self, payload: Dict) -> PaymentProcessorResult:
        """Handle transfer created webhook"""
        transfer = payload.get('data', {}).get('object', {})
        return self.create_success_result(
            transaction_id=transfer.get('id'),
            gateway_response=transfer
        )
    
    def _handle_transfer_failed(self, payload: Dict) -> PaymentProcessorResult:
        """Handle transfer failed webhook"""
        transfer = payload.get('data', {}).get('object', {})
        return self.create_success_result(
            transaction_id=transfer.get('id'),
            gateway_response=transfer
        )
    
    def get_transaction_status(self, gateway_transaction_id: str) -> PaymentProcessorResult:
        """Get transaction status from Stripe"""
        try:
            if gateway_transaction_id.startswith('pi_'):
                # Payment Intent
                payment_intent = stripe.PaymentIntent.retrieve(gateway_transaction_id)
                return self.create_success_result(
                    transaction_id=payment_intent.id,
                    gateway_response=payment_intent.to_dict()
                )
            elif gateway_transaction_id.startswith('tr_'):
                # Transfer
                transfer = stripe.Transfer.retrieve(gateway_transaction_id)
                return self.create_success_result(
                    transaction_id=transfer.id,
                    gateway_response=transfer.to_dict()
                )
            else:
                # Try as charge
                charge = stripe.Charge.retrieve(gateway_transaction_id)
                return self.create_success_result(
                    transaction_id=charge.id,
                    gateway_response=charge.to_dict()
                )
        
        except stripe.error.StripeError as e:
            return self.create_error_result(
                str(e),
                code=getattr(e, 'code', 'stripe_error')
            )
    
    def get_supported_currencies(self) -> list:
        """Get supported currencies for Stripe"""
        # This is a subset of commonly used currencies supported by Stripe
        return [
            'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
            'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'MXN', 'BRL', 'SGD', 'HKD',
            'INR', 'KRW', 'TWD', 'THB', 'MYR', 'PHP', 'IDR', 'VND', 'AED', 'SAR'
        ]
    
    def get_supported_countries(self) -> list:
        """Get supported countries for Stripe"""
        # Major countries supported by Stripe
        return [
            'US', 'CA', 'GB', 'AU', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'CH',
            'AT', 'IE', 'PT', 'LU', 'FI', 'DK', 'SE', 'NO', 'JP', 'SG', 'HK',
            'NZ', 'MX', 'BR', 'IN', 'MY', 'TH', 'PH', 'ID', 'AE', 'SA'
        ]
    
    def validate_credentials(self) -> bool:
        """Validate Stripe API credentials"""
        try:
            # Try to retrieve account information
            stripe.Account.retrieve()
            return True
        except stripe.error.AuthenticationError:
            return False
        except Exception:
            return False
    
    def calculate_fees(self, amount: Decimal, currency: str = 'USD') -> Dict[str, Decimal]:
        """Calculate Stripe processing fees"""
        # Standard Stripe fees (may vary by country and account type)
        if currency.upper() == 'USD':
            percentage_fee = Decimal('0.029')  # 2.9%
            fixed_fee = Decimal('0.30')
        else:
            # International fees are typically higher
            percentage_fee = Decimal('0.039')  # 3.9%
            fixed_fee = Decimal('0.30')
        
        fee_amount = (amount * percentage_fee) + fixed_fee
        
        return {
            'percentage_fee': amount * percentage_fee,
            'fixed_fee': fixed_fee,
            'total_fee': fee_amount,
            'net_amount': amount - fee_amount
        }
    
    # Legacy methods for backward compatibility
    def get_employee_account_form(self):
        """Return form fields needed for Stripe"""
        return [
            {'name': 'account_number', 'type': 'text', 'required': True, 'label': 'Bank Account Number'},
            {'name': 'routing_number', 'type': 'text', 'required': True, 'label': 'Routing Number'},
            {'name': 'account_holder_name', 'type': 'text', 'required': True, 'label': 'Account Holder Name'},
        ]
    
    def validate_account_details(self, details):
        """Validate bank account details"""
        required_fields = ['account_number', 'routing_number', 'account_holder_name']
        for field in required_fields:
            if field not in details or not details[field]:
                return False, f"Missing required field: {field}"
        
        # Additional validation
        if len(details['routing_number']) != 9:
            return False, "Routing number must be 9 digits"
        if not details['routing_number'].isdigit():
            return False, "Routing number must contain only digits"
        
        return True, "Account details are valid"

# Backward compatibility alias
Provider = StripeProcessor