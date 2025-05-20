# payments/providers/flutterwave.py
import requests
import uuid
from django.conf import settings
from .base import PaymentProvider

class Provider(PaymentProvider):
    """Flutterwave payment provider implementation for Africa"""
    
    def __init__(self):
        self.api_key = settings.FLUTTERWAVE_SECRET_KEY
        self.api_url = "https://api.flutterwave.com/v3"
        
    def process_payroll_payment(self, employee, amount, currency, metadata=None):
        """Process a payroll payment using Flutterwave"""
        try:
            # Check if employee has mobile wallet ID
            if not employee.mobile_wallet_id or not employee.mobile_wallet_provider:
                raise ValueError("Employee doesn't have mobile wallet information set up")
                
            # Determine the payment method based on mobile wallet provider
            if employee.mobile_wallet_provider.lower() == 'm-pesa':
                payment_type = "mpesa"
                phone = employee.mobile_wallet_id
                # Ensure proper format for Kenya M-Pesa
                if phone.startswith('0'):
                    phone = '254' + phone[1:]
                    
            elif employee.mobile_wallet_provider.lower() == 'mtn':
                payment_type = "mobile_money_ghana" if currency.upper() == "GHS" else "mobile_money_uganda"
                phone = employee.mobile_wallet_id
                
            elif employee.mobile_wallet_provider.lower() == 'orange':
                payment_type = "mobile_money_franco"
                phone = employee.mobile_wallet_id
                
            else:
                raise ValueError(f"Unsupported mobile wallet provider: {employee.mobile_wallet_provider}")
                
            # Create a mobile money transfer via Flutterwave API
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            tx_ref = f"PAYROLL-{uuid.uuid4().hex[:12]}"
            
            payload = {
                "tx_ref": tx_ref,
                "amount": amount,
                "currency": currency.upper(),
                "payment_type": payment_type,
                "phone_number": phone,
                "email": employee.email,
                "fullname": f"{employee.first_name} {employee.last_name}",
                "meta": metadata or {}
            }
            
            # Add provider-specific fields
            if payment_type == "mpesa":
                payload["country"] = "KE"
            elif payment_type == "mobile_money_ghana":
                payload["country"] = "GH"
                payload["network"] = "MTN"
            elif payment_type == "mobile_money_uganda":
                payload["country"] = "UG"
                payload["network"] = "MTN"
            elif payment_type == "mobile_money_franco":
                payload["country"] = employee.country_code
                
            response = requests.post(
                f"{self.api_url}/charges?type={payment_type}",
                json=payload,
                headers=headers
            )
            
            if response.status_code in (200, 201) and response.json().get('status') == 'success':
                return {
                    'success': True,
                    'transaction_id': response.json().get('data', {}).get('id'),
                    'provider': 'flutterwave',
                    'reference': tx_ref
                }
            else:
                return {
                    'success': False,
                    'error': response.text,
                    'provider': 'flutterwave'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'provider': 'flutterwave'
            }
    
    def process_tax_payment(self, tax_authority, amount, currency, metadata=None):
        """Flutterwave is typically not used for tax payments"""
        return {
            'success': False,
            'error': 'Flutterwave does not support direct tax authority payments',
            'provider': 'flutterwave'
        }
            
    def get_employee_account_form(self):
        """Return form fields needed for Flutterwave Mobile Money"""
        return [
            {'name': 'mobile_wallet_provider', 'type': 'select', 'required': True,
             'options': [
                 {'value': 'M-Pesa', 'label': 'M-Pesa (Kenya)'},
                 {'value': 'MTN', 'label': 'MTN Mobile Money (Ghana, Uganda)'},
                 {'value': 'Airtel', 'label': 'Airtel Money'},
                 {'value': 'Vodafone', 'label': 'Vodafone Cash (Ghana)'},
                 {'value': 'Orange', 'label': 'Orange Money (Francophone countries)'}
             ],
             'help_text': 'Select your mobile money provider'},
            {'name': 'mobile_wallet_id', 'type': 'tel', 'required': True,
             'help_text': 'Enter your mobile money number (e.g., 07XXXXXXXX)'},
            {'name': 'country_code', 'type': 'select', 'required': True,
             'options': [
                 {'value': 'KE', 'label': 'Kenya'},
                 {'value': 'GH', 'label': 'Ghana'},
                 {'value': 'UG', 'label': 'Uganda'},
                 {'value': 'TZ', 'label': 'Tanzania'},
                 {'value': 'RW', 'label': 'Rwanda'},
                 {'value': 'CM', 'label': 'Cameroon'},
                 {'value': 'CI', 'label': 'Côte d\'Ivoire'},
                 {'value': 'SN', 'label': 'Senegal'}
             ],
             'help_text': 'Select your country'}
        ]
        
    def validate_account_details(self, details):
        """Validate mobile money account details"""
        # Check required fields
        if 'mobile_wallet_provider' not in details or not details['mobile_wallet_provider']:
            return False, "Mobile money provider is required"
            
        if 'mobile_wallet_id' not in details or not details['mobile_wallet_id']:
            return False, "Mobile money number is required"
            
        if 'country_code' not in details or not details['country_code']:
            return False, "Country code is required"
            
        # Basic phone number validation
        phone = details['mobile_wallet_id']
        
        # Different countries have different formats
        if details['country_code'] == 'KE':  # Kenya
            if not (phone.startswith('07') or phone.startswith('01') or 
                    phone.startswith('254') or phone.startswith('+254')):
                return False, "Invalid Kenyan phone number format"
                
        elif details['country_code'] == 'GH':  # Ghana
            if not (phone.startswith('0') or phone.startswith('233') or phone.startswith('+233')):
                return False, "Invalid Ghanaian phone number format"
                
        # Generic validation for other countries
        # Remove any non-digit characters for counting
        digits_only = ''.join(c for c in phone if c.isdigit())
        if len(digits_only) < 9 or len(digits_only) > 15:
            return False, "Phone number should be between 9 and 15 digits"
                
        return True, "Mobile money details are valid" 