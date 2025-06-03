# payments/providers/stripe.py
import stripe
from django.conf import settings
from .base import PaymentProvider

stripe.api_key = settings.STRIPE_SECRET_KEY

class Provider(PaymentProvider):
    """Stripe payment provider implementation"""
    
    def process_payroll_payment(self, employee, amount, currency, metadata=None):
        """Process a payroll payment using Stripe"""
        try:
            # Check if employee has a Stripe account set up
            if not employee.stripe_account_id:
                raise ValueError("Employee doesn't have a Stripe account set up")
                
            # Create a transfer to the employee's connected account
            transfer = stripe.Transfer.create(
                amount=int(amount * 100),  # Convert to cents
                currency=currency.lower(),
                destination=employee.stripe_account_id,
                metadata=metadata or {}
            )
            
            return {
                'success': True,
                'transaction_id': transfer.id,
                'provider': 'stripe'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'provider': 'stripe'
            }
    
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