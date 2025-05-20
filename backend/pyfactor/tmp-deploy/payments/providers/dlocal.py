# payments/providers/dlocal.py
import requests
import hashlib
import hmac
import datetime
import uuid
import json
from django.conf import settings
from .base import PaymentProvider

class Provider(PaymentProvider):
    """DLocal payment provider implementation for Latin America and emerging markets"""
    
    def __init__(self):
        self.api_key = settings.DLOCAL_API_KEY
        self.api_secret = settings.DLOCAL_API_SECRET
        self.api_url = "https://api.dlocal.com"
        self.x_login = settings.DLOCAL_X_LOGIN
        
    def _generate_authorization_header(self, request_body=None):
        """Generate DLocal authorization headers"""
        date = datetime.datetime.utcnow().strftime('%Y-%m-%d%H:%M:%S')
        random_str = str(uuid.uuid4())
        
        # Create signature
        if request_body:
            # If body exists, include it in the signature
            if isinstance(request_body, dict):
                request_body = json.dumps(request_body)
                
            to_hash = f"{self.x_login}{date}{random_str}{request_body}"
        else:
            to_hash = f"{self.x_login}{date}{random_str}"
            
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            to_hash.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        headers = {
            "X-Date": date,
            "X-Login": self.x_login,
            "X-Trans-Key": self.api_key,
            "X-Version": "2.0",
            "X-Random": random_str,
            "X-Signature": signature,
            "Content-Type": "application/json"
        }
        
        return headers
    
    def process_payroll_payment(self, employee, amount, currency, metadata=None):
        """Process a payroll payment using DLocal"""
        try:
            # Check if employee has bank account details
            if not hasattr(employee, 'bank_account_number') or not employee.bank_account_number:
                raise ValueError("Employee doesn't have bank account details set up")
                
            # Get country-specific bank info
            metadata = metadata or {}
            country = employee.country.code if hasattr(employee, 'country') else metadata.get('country')
            if not country:
                raise ValueError("Employee country is required")
                
            # Construct payout request
            payout_data = {
                "amount": float(amount),
                "currency": currency,
                "country": country,
                "payment_method": "BANK_TRANSFER",
                "beneficiary": {
                    "name": f"{employee.first_name} {employee.last_name}",
                    "document": employee.document_id,  # National ID or Tax ID
                    "document_type": employee.document_type,  # e.g., CPF for Brazil, DNI for Argentina
                    "bank_account": employee.bank_account_number,
                    "bank_code": employee.bank_code if hasattr(employee, 'bank_code') else None,
                    "branch": employee.branch_code if hasattr(employee, 'branch_code') else None,
                    "account_type": employee.account_type if hasattr(employee, 'account_type') else None,
                    "email": employee.email
                },
                "description": metadata.get('description', 'Salary payment'),
                "external_id": f"PAYROLL-{employee.id}-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
            }
            
            # Remove None values from beneficiary details
            payout_data['beneficiary'] = {k: v for k, v in payout_data['beneficiary'].items() if v is not None}
            
            # Add any additional country-specific fields from metadata
            if 'additional_fields' in metadata:
                for key, value in metadata['additional_fields'].items():
                    payout_data['beneficiary'][key] = value
            
            # Make API request
            headers = self._generate_authorization_header(payout_data)
            
            response = requests.post(
                f"{self.api_url}/payouts",
                json=payout_data,
                headers=headers
            )
            
            if response.status_code in (200, 201):
                result = response.json()
                if result.get('status') == 'SUCCESS' or result.get('status') == 'PENDING':
                    return {
                        'success': True,
                        'transaction_id': result.get('id'),
                        'provider': 'dlocal',
                        'status': result.get('status')
                    }
                else:
                    return {
                        'success': False,
                        'error': f"Payment status: {result.get('status')}",
                        'provider': 'dlocal'
                    }
            else:
                return {
                    'success': False,
                    'error': response.text,
                    'provider': 'dlocal'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'provider': 'dlocal'
            }
    
    def process_tax_payment(self, tax_authority, amount, currency, metadata=None):
        """Process a tax payment using DLocal"""
        try:
            # Ensure metadata is not None
            metadata = metadata or {}
            
            # Tax payment specifics depend on the country
            country = metadata.get('country')
            if not country:
                raise ValueError("Country is required for tax payments")
                
            # For tax payments, we require specific tax authority details
            if 'tax_id' not in metadata:
                raise ValueError("Tax authority ID is required in metadata")
                
            # Construct payment request
            payment_data = {
                "amount": float(amount),
                "currency": currency,
                "country": country,
                "payment_method_id": "BANK_TRANSFER",
                "payment_method_flow": "DIRECT",
                "payer": {
                    "name": metadata.get('payer_name', settings.COMPANY_NAME),
                    "document": metadata.get('payer_document', settings.COMPANY_TAX_ID),
                    "email": metadata.get('payer_email', settings.COMPANY_EMAIL)
                },
                "description": f"Tax payment to {tax_authority}",
                "external_reference": f"TAX-{metadata['tax_id']}-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}",
                "notification_url": settings.DLOCAL_NOTIFICATION_URL,
                "additional_data": {
                    "tax_id": metadata['tax_id'],
                    "tax_type": metadata.get('tax_type', 'INCOME'),
                    "period": metadata.get('period', datetime.datetime.now().strftime('%Y-%m'))
                }
            }
            
            # Add any additional country-specific fields from metadata
            if 'additional_fields' in metadata:
                for key, value in metadata['additional_fields'].items():
                    payment_data['additional_data'][key] = value
            
            # Make API request
            headers = self._generate_authorization_header(payment_data)
            
            response = requests.post(
                f"{self.api_url}/payments",
                json=payment_data,
                headers=headers
            )
            
            if response.status_code in (200, 201):
                result = response.json()
                if result.get('status') == 'APPROVED' or result.get('status') == 'PENDING':
                    return {
                        'success': True,
                        'transaction_id': result.get('id'),
                        'provider': 'dlocal',
                        'status': result.get('status')
                    }
                else:
                    return {
                        'success': False,
                        'error': f"Payment status: {result.get('status')}",
                        'provider': 'dlocal'
                    }
            else:
                return {
                    'success': False,
                    'error': response.text,
                    'provider': 'dlocal'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'provider': 'dlocal'
            }
            
    def get_employee_account_form(self):
        """Return form fields needed for DLocal - varies by country"""
        # Base fields - would be dynamically adjusted by country in a real implementation
        return [
            {'name': 'country', 'type': 'select', 'required': True,
             'options': [
                 {'value': 'BR', 'label': 'Brazil'},
                 {'value': 'AR', 'label': 'Argentina'},
                 {'value': 'CL', 'label': 'Chile'},
                 {'value': 'CO', 'label': 'Colombia'},
                 {'value': 'MX', 'label': 'Mexico'},
                 {'value': 'PE', 'label': 'Peru'},
                 {'value': 'UY', 'label': 'Uruguay'},
                 # Other countries would be added as supported
             ],
             'help_text': 'Select your country'},
            {'name': 'document_type', 'type': 'select', 'required': True,
             'options': [
                 {'value': 'CPF', 'label': 'CPF (Brazil)'},
                 {'value': 'CNPJ', 'label': 'CNPJ (Brazil - Company)'},
                 {'value': 'DNI', 'label': 'DNI (Argentina)'},
                 {'value': 'RUT', 'label': 'RUT (Chile)'},
                 {'value': 'CC', 'label': 'CC (Colombia)'},
                 {'value': 'RFC', 'label': 'RFC (Mexico)'},
                 {'value': 'CI', 'label': 'CI (Uruguay)'},
                 # Other document types would be added as supported
             ],
             'help_text': 'Select your ID type'},
            {'name': 'document_id', 'type': 'text', 'required': True,
             'help_text': 'Enter your ID number'},
            {'name': 'bank_code', 'type': 'text', 'required': True,
             'help_text': 'Enter your bank code'},
            {'name': 'branch_code', 'type': 'text', 'required': True,
             'help_text': 'Enter your branch code (if applicable)'},
            {'name': 'bank_account_number', 'type': 'text', 'required': True,
             'help_text': 'Enter your bank account number'},
            {'name': 'account_type', 'type': 'select', 'required': True,
             'options': [
                 {'value': 'SAVINGS', 'label': 'Savings Account'},
                 {'value': 'CHECKING', 'label': 'Checking Account'}
             ],
             'help_text': 'Select your account type'}
        ]
        
    def validate_account_details(self, details):
        """Validate DLocal account details"""
        # Basic validation - would be more comprehensive in production
        required_fields = ['country', 'document_type', 'document_id', 
                          'bank_code', 'bank_account_number', 'account_type']
        
        for field in required_fields:
            if field not in details or not details[field]:
                return False, f"Missing required field: {field}"
        
        # Country-specific validations
        country = details['country']
        
        if country == 'BR':  # Brazil
            # Validate CPF (11 digits) or CNPJ (14 digits)
            doc_id = ''.join(filter(str.isdigit, details['document_id']))
            if details['document_type'] == 'CPF' and len(doc_id) != 11:
                return False, "CPF must be 11 digits"
            elif details['document_type'] == 'CNPJ' and len(doc_id) != 14:
                return False, "CNPJ must be 14 digits"
                
        elif country == 'AR':  # Argentina
            # Validate DNI (7-8 digits)
            doc_id = ''.join(filter(str.isdigit, details['document_id']))
            if not (7 <= len(doc_id) <= 8):
                return False, "DNI must be 7-8 digits"
                
        # Bank account validation (simplified)
        if not details['bank_account_number'] or len(details['bank_account_number']) < 5:
            return False, "Bank account number is invalid"
            
        return True, "Account details are valid" 