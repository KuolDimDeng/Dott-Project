# payments/providers/mpesa.py
import requests
from django.conf import settings
from .base import PaymentProvider
import base64
import datetime
from requests.auth import HTTPBasicAuth

class Provider(PaymentProvider):
    """M-Pesa payment provider for Kenya"""
    
    def __init__(self):
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.api_url = settings.MPESA_API_URL
        self.shortcode = settings.MPESA_SHORTCODE
        self.passkey = settings.MPESA_PASSKEY
        
    def _get_access_token(self):
        """Get M-Pesa API access token"""
        url = f"{self.api_url}/oauth/v1/generate?grant_type=client_credentials"
        response = requests.get(
            url,
            auth=HTTPBasicAuth(self.consumer_key, self.consumer_secret)
        )
        
        if response.status_code == 200:
            return response.json()['access_token']
        else:
            raise Exception(f"Failed to get M-Pesa access token: {response.text}")
            
    def _generate_password(self):
        """Generate M-Pesa API password"""
        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        password_str = f"{self.shortcode}{self.passkey}{timestamp}"
        password_bytes = password_str.encode('ascii')
        return base64.b64encode(password_bytes).decode('utf-8'), timestamp
    
    def process_payroll_payment(self, employee, amount, currency, metadata=None):
        """Process a payroll payment using M-Pesa"""
        try:
            # Check if employee has M-Pesa phone number
            if not employee.mpesa_phone_number:
                raise ValueError("Employee doesn't have an M-Pesa phone number")
                
            # Format phone number (remove leading 0 and add country code)
            phone = employee.mpesa_phone_number
            if phone.startswith('0'):
                phone = '254' + phone[1:]
                
            # Get access token
            access_token = self._get_access_token()
            
            # Generate password and timestamp
            password, timestamp = self._generate_password()
            
            # Make B2C payment request
            url = f"{self.api_url}/mpesa/b2c/v1/paymentrequest"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "InitiatorName": settings.MPESA_INITIATOR_NAME,
                "SecurityCredential": password,
                "CommandID": "SalaryPayment",
                "Amount": str(amount),
                "PartyA": self.shortcode,
                "PartyB": phone,
                "Remarks": metadata.get('remarks', 'Salary payment') if metadata else 'Salary payment',
                "QueueTimeOutURL": settings.MPESA_TIMEOUT_URL,
                "ResultURL": settings.MPESA_RESULT_URL,
                "Occasion": metadata.get('occasion', '') if metadata else ''
            }
            
            response = requests.post(url, json=payload, headers=headers)
            
            if response.status_code == 200 and response.json().get('ResponseCode') == '0':
                return {
                    'success': True,
                    'transaction_id': response.json().get('ConversationID'),
                    'provider': 'mpesa'
                }
            else:
                return {
                    'success': False,
                    'error': response.text,
                    'provider': 'mpesa'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'provider': 'mpesa'
            }
    
    def process_tax_payment(self, tax_authority, amount, currency, metadata=None):
        """M-Pesa cannot be used for tax payments directly"""
        return {
            'success': False,
            'error': 'M-Pesa does not support direct tax authority payments',
            'provider': 'mpesa'
        }
            
    def get_employee_account_form(self):
        """Return form fields needed for M-Pesa"""
        return [
            {'name': 'mpesa_phone_number', 'type': 'tel', 'required': True, 
             'help_text': 'Enter M-Pesa registered phone number (e.g., 07XXXXXXXX)'},
        ]
        
    def validate_account_details(self, details):
        """Validate M-Pesa account details"""
        if 'mpesa_phone_number' not in details or not details['mpesa_phone_number']:
            return False, "M-Pesa phone number is required"
            
        # Basic phone number validation for Kenya
        phone = details['mpesa_phone_number']
        if not (phone.startswith('07') or phone.startswith('01') or 
                phone.startswith('254') or phone.startswith('+254')):
            return False, "Invalid Kenyan phone number format"
                
        if phone.startswith('0') and len(phone) != 10:
            return False, "Phone number should be 10 digits (starting with 07/01)"
            
        if (phone.startswith('254') and len(phone) != 12) or \
           (phone.startswith('+254') and len(phone) != 13):
            return False, "Invalid phone number length with country code"
                
        return True, "Phone number is valid"