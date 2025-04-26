import paypalrestsdk
import datetime
from django.conf import settings
from .base import PaymentProvider

# Configure PayPal SDK
paypalrestsdk.configure({
    "mode": settings.PAYPAL_MODE,  # "sandbox" or "live"
    "client_id": settings.PAYPAL_CLIENT_ID,
    "client_secret": settings.PAYPAL_CLIENT_SECRET
})

class Provider(PaymentProvider):
    """PayPal payment provider implementation"""
    
    def process_payroll_payment(self, employee, amount, currency, metadata=None):
        """Process a payroll payment using PayPal"""
        try:
            # Check if employee has PayPal email set up
            if not employee.paypal_email:
                raise ValueError("Employee doesn't have a PayPal email set up")
                
            # Create a payout to the employee's PayPal account
            payout = paypalrestsdk.Payout({
                "sender_batch_header": {
                    "sender_batch_id": f"Payroll_{employee.id}_{int(datetime.datetime.now().timestamp())}",
                    "email_subject": metadata.get('email_subject', "You received a payment") if metadata else "You received a payment"
                },
                "items": [
                    {
                        "recipient_type": "EMAIL",
                        "amount": {
                            "value": str(amount),
                            "currency": currency.upper()
                        },
                        "receiver": employee.paypal_email,
                        "note": metadata.get('note', "Salary payment") if metadata else "Salary payment",
                        "sender_item_id": f"Salary_{employee.id}_{int(datetime.datetime.now().timestamp())}"
                    }
                ]
            })
            
            if payout.create():
                return {
                    'success': True,
                    'transaction_id': payout.batch_header.payout_batch_id,
                    'provider': 'paypal'
                }
            else:
                return {
                    'success': False,
                    'error': payout.error,
                    'provider': 'paypal'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'provider': 'paypal'
            }
    
    def process_tax_payment(self, tax_authority, amount, currency, metadata=None):
        """Process a tax payment using PayPal"""
        try:
            # Create a PayPal payment for the tax authority
            payment = paypalrestsdk.Payment({
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "transactions": [{
                    "amount": {
                        "total": str(amount),
                        "currency": currency.upper()
                    },
                    "description": f"Tax payment to {tax_authority}",
                    "custom": metadata.get('custom_id', "") if metadata else "",
                    "invoice_number": metadata.get('invoice_number', "") if metadata else ""
                }],
                "redirect_urls": {
                    "return_url": settings.PAYPAL_RETURN_URL,
                    "cancel_url": settings.PAYPAL_CANCEL_URL
                }
            })
            
            if payment.create():
                return {
                    'success': True,
                    'transaction_id': payment.id,
                    'provider': 'paypal',
                    'approval_url': next(link.href for link in payment.links if link.rel == 'approval_url')
                }
            else:
                return {
                    'success': False,
                    'error': payment.error,
                    'provider': 'paypal'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'provider': 'paypal'
            }
            
    def get_employee_account_form(self):
        """Return form fields needed for PayPal"""
        return [
            {'name': 'paypal_email', 'type': 'email', 'required': True, 
             'help_text': 'Enter PayPal account email address'},
        ]
        
    def validate_account_details(self, details):
        """Validate PayPal account details"""
        # Basic validation
        if 'paypal_email' not in details or not details['paypal_email']:
            return False, "PayPal email is required"
            
        # Basic email format validation
        email = details['paypal_email']
        if '@' not in email or '.' not in email:
            return False, "Invalid email format"
            
        return True, "PayPal account details are valid" 