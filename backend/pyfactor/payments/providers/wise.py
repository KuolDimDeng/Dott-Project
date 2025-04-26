# payments/providers/wise.py
import requests
import uuid
from django.conf import settings
from .base import PaymentProvider

class Provider(PaymentProvider):
    """Wise (formerly TransferWise) payment provider implementation"""
    
    def __init__(self):
        self.api_token = settings.WISE_API_TOKEN
        self.api_url = "https://api.transferwise.com"
        self.profile_id = settings.WISE_PROFILE_ID  # Business profile ID
        
    def process_payroll_payment(self, employee, amount, currency, metadata=None):
        """Process an international payroll payment using Wise"""
        try:
            # Check if employee has bank details set up
            if not hasattr(employee, 'wise_recipient_id') or not employee.wise_recipient_id:
                # If no recipient ID is saved, we need to create one, but this requires additional details
                # that would typically be collected in a separate workflow
                raise ValueError("Employee doesn't have Wise recipient details set up")
                
            # Create a transfer using the recipient ID
            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json"
            }
            
            # We assume the source currency is the business account's currency
            source_currency = settings.WISE_SOURCE_CURRENCY
            
            # Create quote for the transfer
            quote_payload = {
                "profileId": self.profile_id,
                "sourceCurrency": source_currency,
                "targetCurrency": currency,
                "sourceAmount": amount if source_currency == currency else None,
                "targetAmount": amount if source_currency != currency else None,
                "payOut": "BANK_TRANSFER"
            }
            
            quote_response = requests.post(
                f"{self.api_url}/v3/quotes",
                json=quote_payload,
                headers=headers
            )
            
            if quote_response.status_code != 200:
                return {
                    'success': False,
                    'error': f"Failed to create quote: {quote_response.text}",
                    'provider': 'wise'
                }
                
            quote = quote_response.json()
            
            # Create the transfer
            transfer_payload = {
                "targetAccount": employee.wise_recipient_id,
                "quoteUuid": quote["id"],
                "customerTransactionId": str(uuid.uuid4()),
                "details": {
                    "reference": metadata.get('reference', 'Salary payment') if metadata else 'Salary payment',
                    "transferPurpose": "verification.transfers.purpose.pay.payroll",
                    "sourceOfFunds": "verification.source.of.funds.payroll"
                }
            }
            
            transfer_response = requests.post(
                f"{self.api_url}/v1/transfers",
                json=transfer_payload,
                headers=headers
            )
            
            if transfer_response.status_code not in (200, 201):
                return {
                    'success': False,
                    'error': f"Failed to create transfer: {transfer_response.text}",
                    'provider': 'wise'
                }
                
            transfer = transfer_response.json()
            
            # Fund the transfer
            fund_payload = {
                "type": "BALANCE"  # Fund from Wise balance
            }
            
            fund_response = requests.post(
                f"{self.api_url}/v3/profiles/{self.profile_id}/transfers/{transfer['id']}/payments",
                json=fund_payload,
                headers=headers
            )
            
            if fund_response.status_code not in (200, 201):
                return {
                    'success': False,
                    'error': f"Failed to fund transfer: {fund_response.text}",
                    'provider': 'wise'
                }
                
            return {
                'success': True,
                'transaction_id': transfer['id'],
                'provider': 'wise'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'provider': 'wise'
            }
    
    def process_tax_payment(self, tax_authority, amount, currency, metadata=None):
        """Process a tax payment using Wise"""
        try:
            # For tax payments, we assume the tax authority details are provided in metadata
            if not metadata or 'recipient_id' not in metadata:
                raise ValueError("Tax authority recipient ID is required in metadata")
                
            # Create a transfer using the recipient ID similar to payroll payment
            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json"
            }
            
            # We assume the source currency is the business account's currency
            source_currency = settings.WISE_SOURCE_CURRENCY
            
            # Create quote for the transfer
            quote_payload = {
                "profileId": self.profile_id,
                "sourceCurrency": source_currency,
                "targetCurrency": currency,
                "sourceAmount": amount if source_currency == currency else None,
                "targetAmount": amount if source_currency != currency else None,
                "payOut": "BANK_TRANSFER"
            }
            
            quote_response = requests.post(
                f"{self.api_url}/v3/quotes",
                json=quote_payload,
                headers=headers
            )
            
            if quote_response.status_code != 200:
                return {
                    'success': False,
                    'error': f"Failed to create quote: {quote_response.text}",
                    'provider': 'wise'
                }
                
            quote = quote_response.json()
            
            # Create the transfer
            transfer_payload = {
                "targetAccount": metadata['recipient_id'],
                "quoteUuid": quote["id"],
                "customerTransactionId": str(uuid.uuid4()),
                "details": {
                    "reference": metadata.get('reference', f"Tax payment to {tax_authority}"),
                    "transferPurpose": "verification.transfers.purpose.pay.tax",
                    "sourceOfFunds": "verification.source.of.funds.business"
                }
            }
            
            transfer_response = requests.post(
                f"{self.api_url}/v1/transfers",
                json=transfer_payload,
                headers=headers
            )
            
            if transfer_response.status_code not in (200, 201):
                return {
                    'success': False,
                    'error': f"Failed to create transfer: {transfer_response.text}",
                    'provider': 'wise'
                }
                
            transfer = transfer_response.json()
            
            # Fund the transfer
            fund_payload = {
                "type": "BALANCE"  # Fund from Wise balance
            }
            
            fund_response = requests.post(
                f"{self.api_url}/v3/profiles/{self.profile_id}/transfers/{transfer['id']}/payments",
                json=fund_payload,
                headers=headers
            )
            
            if fund_response.status_code not in (200, 201):
                return {
                    'success': False,
                    'error': f"Failed to fund transfer: {fund_response.text}",
                    'provider': 'wise'
                }
                
            return {
                'success': True,
                'transaction_id': transfer['id'],
                'provider': 'wise'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'provider': 'wise'
            }
            
    def get_employee_account_form(self):
        """Return form fields needed for Wise"""
        return [
            # Wise requires different fields based on country, currency, and payment method
            # This is a simplified version
            {'name': 'first_name', 'type': 'text', 'required': True},
            {'name': 'last_name', 'type': 'text', 'required': True},
            {'name': 'country', 'type': 'select', 'required': True,
             'options': [
                 {'value': 'US', 'label': 'United States'},
                 {'value': 'GB', 'label': 'United Kingdom'},
                 {'value': 'EU', 'label': 'Europe (SEPA)'},
                 # Many more countries would be included here
             ]},
            {'name': 'currency', 'type': 'select', 'required': True,
             'options': [
                 {'value': 'USD', 'label': 'US Dollar (USD)'},
                 {'value': 'EUR', 'label': 'Euro (EUR)'},
                 {'value': 'GBP', 'label': 'British Pound (GBP)'},
                 # Many more currencies would be included here
             ]},
            {'name': 'account_number', 'type': 'text', 'required': True,
             'help_text': 'For US, use ACH routing number. For UK, use sort code.'},
            {'name': 'routing_number', 'type': 'text', 'required': False,
             'help_text': 'For US accounts only'},
            {'name': 'iban', 'type': 'text', 'required': False,
             'help_text': 'For SEPA countries only'},
            {'name': 'bic', 'type': 'text', 'required': False,
             'help_text': 'For SEPA countries only (also known as SWIFT code)'},
            {'name': 'address_line1', 'type': 'text', 'required': True},
            {'name': 'address_line2', 'type': 'text', 'required': False},
            {'name': 'city', 'type': 'text', 'required': True},
            {'name': 'state', 'type': 'text', 'required': False},
            {'name': 'postal_code', 'type': 'text', 'required': True},
        ]
        
    def validate_account_details(self, details):
        """Validate Wise account details"""
        # This is a simplified validation - in a real implementation, 
        # validation would be more comprehensive and country-specific
        
        # Check required fields
        required_fields = ['first_name', 'last_name', 'country', 'currency', 
                           'account_number', 'address_line1', 'city', 'postal_code']
        
        for field in required_fields:
            if field not in details or not details[field]:
                return False, f"Missing required field: {field}"
                
        # Country-specific validations
        if details['country'] == 'US':
            if 'routing_number' not in details or not details['routing_number']:
                return False, "Routing number is required for US accounts"
                
            # Basic routing number validation (9 digits for US)
            routing = details['routing_number'].replace('-', '').replace(' ', '')
            if not routing.isdigit() or len(routing) != 9:
                return False, "US routing number must be 9 digits"
                
        elif details['country'] == 'EU':
            if 'iban' not in details or not details['iban']:
                return False, "IBAN is required for European accounts"
                
            # Basic IBAN validation (length varies by country, but always starts with country code)
            iban = details['iban'].replace(' ', '').upper()
            if len(iban) < 15 or not iban[:2].isalpha() or not iban[2:].isalnum():
                return False, "Invalid IBAN format"
                
        return True, "Account details are valid" 