# payments/providers/stripe.py
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
            if payment_method and payment_method.provider_account_id:
                intent_data['payment_method'] = payment_method.provider_account_id
                intent_data['confirmation_method'] = 'manual'
                intent_data['confirm'] = True
            
            # Add platform fee if using Connect
            if self.connect_account_id and transaction.fee_amount > 0:
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
    
    def process_tax_payment(self, tax_authority, amount, currency, metadata=None):
        """Process a tax payment using Stripe"""
        try:
            # Create a charge for the tax payment
            charge = stripe.Charge.create(
                amount=int(amount * 100),  # Convert to cents
                currency=currency.lower(),
                description=f"Tax payment to {tax_authority}",
                metadata=metadata or {}
            )
            
            return {
                'success': True,
                'transaction_id': charge.id,
                'provider': 'stripe'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'provider': 'stripe'
            }
            
    def get_employee_account_form(self):
        """Return form fields needed for Stripe"""
        return [
            {'name': 'account_number', 'type': 'text', 'required': True},
            {'name': 'routing_number', 'type': 'text', 'required': True},
            {'name': 'account_holder_name', 'type': 'text', 'required': True},
        ]
        
    def validate_account_details(self, details):
        """Validate bank account details"""
        # Basic validation
        required_fields = ['account_number', 'routing_number', 'account_holder_name']
        for field in required_fields:
            if field not in details or not details[field]:
                return False, f"Missing required field: {field}"
                
        return True, "Account details are valid"