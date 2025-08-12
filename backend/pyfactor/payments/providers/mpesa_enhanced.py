# payments/providers/mpesa_enhanced.py
import requests
import base64
import json
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any
from django.conf import settings
from .base import PaymentProcessor, PaymentProcessorResult

class MPesaProcessor(PaymentProcessor):
    """Enhanced M-Pesa payment processor with comprehensive functionality"""
    
    def __init__(self, gateway_config: Dict[str, Any]):
        super().__init__(gateway_config)
        
        # M-Pesa specific configuration
        self.consumer_key = gateway_config.get('consumer_key') or settings.MPESA_CONSUMER_KEY
        self.consumer_secret = gateway_config.get('consumer_secret') or settings.MPESA_CONSUMER_SECRET
        self.business_short_code = gateway_config.get('business_short_code') or settings.MPESA_BUSINESS_SHORT_CODE
        self.passkey = gateway_config.get('passkey') or settings.MPESA_PASSKEY
        self.callback_url = gateway_config.get('callback_url')
        
        # API URLs
        if self.is_sandbox:
            self.base_url = "https://sandbox.safaricom.co.ke"
        else:
            self.base_url = "https://api.safaricom.co.ke"
        
        self.auth_url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        self.stk_push_url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        self.stk_query_url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
        self.b2c_url = f"{self.base_url}/mpesa/b2c/v1/paymentrequest"
        
        self.access_token = None
        self.token_expires_at = None
        
        self.log_debug("M-Pesa processor initialized", {
            'sandbox': self.is_sandbox,
            'business_short_code': self.business_short_code
        })
    
    def get_access_token(self) -> str:
        """Get M-Pesa API access token"""
        if self.access_token and self.token_expires_at:
            if datetime.now() < self.token_expires_at:
                return self.access_token
        
        try:
            # Create authorization header
            auth_string = f"{self.consumer_key}:{self.consumer_secret}"
            auth_bytes = auth_string.encode('ascii')
            auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
            
            headers = {
                'Authorization': f'Basic {auth_b64}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(self.auth_url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            self.access_token = data['access_token']
            
            # Token expires in 1 hour
            from datetime import timedelta
            self.token_expires_at = datetime.now() + timedelta(seconds=3600)
            
            self.log_debug("Access token obtained")
            return self.access_token
            
        except Exception as e:
            self.log_error("Failed to get access token", e)
            raise
    
    def generate_password(self) -> tuple:
        """Generate password and timestamp for STK push"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password_string = f"{self.business_short_code}{self.passkey}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode('utf-8')
        return password, timestamp
    
    def process_payment(self, transaction, payment_method=None) -> PaymentProcessorResult:
        """Process a payment using M-Pesa STK Push"""
        self.log_debug("Processing M-Pesa payment", {
            'transaction_id': str(transaction.id),
            'amount': str(transaction.amount),
            'currency': transaction.currency
        })
        
        try:
            # Validate currency
            if transaction.currency.upper() != 'KES':
                return self.create_error_result(
                    "M-Pesa only supports KES currency",
                    code='unsupported_currency'
                )
            
            # Get phone number from payment method or transaction
            phone_number = None
            if payment_method and hasattr(payment_method, 'phone_number'):
                phone_number = payment_method.phone_number
            elif hasattr(transaction, 'recipient_phone') and transaction.recipient_phone:
                phone_number = transaction.recipient_phone
            
            if not phone_number:
                return self.create_error_result(
                    "Phone number is required for M-Pesa payments",
                    code='missing_phone_number'
                )
            
            # Format phone number (remove leading + and ensure it starts with 254)
            phone_number = phone_number.strip().replace('+', '')
            if phone_number.startswith('0'):
                phone_number = '254' + phone_number[1:]
            elif not phone_number.startswith('254'):
                phone_number = '254' + phone_number
            
            # Get access token
            access_token = self.get_access_token()
            
            # Generate password and timestamp
            password, timestamp = self.generate_password()
            
            # Prepare STK push request
            stk_data = {
                "BusinessShortCode": self.business_short_code,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": int(transaction.amount),  # M-Pesa expects integer
                "PartyA": phone_number,
                "PartyB": self.business_short_code,
                "PhoneNumber": phone_number,
                "CallBackURL": self.callback_url,
                "AccountReference": transaction.reference_number,
                "TransactionDesc": transaction.description[:100] if transaction.description else f"Payment {transaction.reference_number}"
            }
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(self.stk_push_url, json=stk_data, headers=headers)
            response_data = response.json()
            
            self.log_debug("STK push response", {
                'response_code': response_data.get('ResponseCode'),
                'checkout_request_id': response_data.get('CheckoutRequestID')
            })
            
            if response_data.get('ResponseCode') == '0':
                # Success - STK push sent
                return self.create_success_result(
                    transaction_id=response_data.get('CheckoutRequestID'),
                    gateway_response=response_data,
                    requires_action=True,
                    action_data={
                        'checkout_request_id': response_data.get('CheckoutRequestID'),
                        'merchant_request_id': response_data.get('MerchantRequestID'),
                        'message': response_data.get('CustomerMessage', 'Please complete payment on your phone')
                    }
                )
            else:
                return self.create_error_result(
                    response_data.get('errorMessage', 'STK push failed'),
                    code=response_data.get('errorCode', 'stk_push_failed'),
                    gateway_response=response_data
                )
                
        except requests.RequestException as e:
            self.log_error("HTTP error during M-Pesa payment", e)
            return self.create_error_result(
                "Network error while processing M-Pesa payment",
                code='network_error'
            )
        except Exception as e:
            self.log_error("Unexpected error processing M-Pesa payment", e)
            return self.create_error_result(
                "An unexpected error occurred while processing the M-Pesa payment",
                code='internal_error'
            )
    
    def process_payout(self, transaction, payment_method) -> PaymentProcessorResult:
        """Process a payout using M-Pesa B2C"""
        self.log_debug("Processing M-Pesa payout", {
            'transaction_id': str(transaction.id),
            'amount': str(transaction.amount),
            'recipient': transaction.recipient_name
        })
        
        try:
            # Validate currency
            if transaction.currency.upper() != 'KES':
                return self.create_error_result(
                    "M-Pesa only supports KES currency",
                    code='unsupported_currency'
                )
            
            # Get phone number
            phone_number = None
            if hasattr(payment_method, 'phone_number'):
                phone_number = payment_method.phone_number
            elif hasattr(transaction, 'recipient_phone') and transaction.recipient_phone:
                phone_number = transaction.recipient_phone
            
            if not phone_number:
                return self.create_error_result(
                    "Phone number is required for M-Pesa payouts",
                    code='missing_phone_number'
                )
            
            # Format phone number
            phone_number = phone_number.strip().replace('+', '')
            if phone_number.startswith('0'):
                phone_number = '254' + phone_number[1:]
            elif not phone_number.startswith('254'):
                phone_number = '254' + phone_number
            
            # Get access token
            access_token = self.get_access_token()
            
            # Prepare B2C request
            b2c_data = {
                "InitiatorName": self.config.get('initiator_name', 'api'),
                "SecurityCredential": self.config.get('security_credential'),
                "CommandID": "BusinessPayment",
                "Amount": int(transaction.amount),
                "PartyA": self.business_short_code,
                "PartyB": phone_number,
                "Remarks": transaction.description[:100] if transaction.description else f"Payout {transaction.reference_number}",
                "QueueTimeOutURL": self.config.get('timeout_url'),
                "ResultURL": self.callback_url,
                "Occasion": transaction.reference_number
            }
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(self.b2c_url, json=b2c_data, headers=headers)
            response_data = response.json()
            
            self.log_debug("B2C response", {
                'response_code': response_data.get('ResponseCode'),
                'conversation_id': response_data.get('ConversationID')
            })
            
            if response_data.get('ResponseCode') == '0':
                return self.create_success_result(
                    transaction_id=response_data.get('ConversationID'),
                    gateway_response=response_data
                )
            else:
                return self.create_error_result(
                    response_data.get('errorMessage', 'B2C payout failed'),
                    code=response_data.get('errorCode', 'b2c_failed'),
                    gateway_response=response_data
                )
                
        except Exception as e:
            self.log_error("Error processing M-Pesa payout", e)
            return self.create_error_result(
                "An unexpected error occurred while processing the M-Pesa payout",
                code='internal_error'
            )
    
    def process_refund(self, original_transaction, refund_amount: Decimal, 
                      reason: str = None) -> PaymentProcessorResult:
        """M-Pesa refunds are typically handled manually"""
        return self.create_error_result(
            "M-Pesa refunds must be processed manually through the Safaricom portal",
            code='manual_refund_required'
        )
    
    def add_payment_method(self, user, method_data: Dict) -> PaymentProcessorResult:
        """Add M-Pesa payment method (just validate phone number)"""
        phone_number = method_data.get('phone_number')
        if not phone_number:
            return self.create_error_result(
                "Phone number is required for M-Pesa",
                code='missing_phone_number'
            )
        
        # Format and validate phone number
        phone_number = phone_number.strip().replace('+', '')
        if phone_number.startswith('0'):
            phone_number = '254' + phone_number[1:]
        elif not phone_number.startswith('254'):
            phone_number = '254' + phone_number
        
        # Basic validation
        if not phone_number.isdigit() or len(phone_number) != 12:
            return self.create_error_result(
                "Invalid Kenyan phone number format",
                code='invalid_phone_number'
            )
        
        return self.create_success_result(
            transaction_id=phone_number,
            gateway_response={'phone_number': phone_number, 'validated': True}
        )
    
    def verify_payment_method(self, payment_method, verification_data: Dict) -> PaymentProcessorResult:
        """M-Pesa payment methods don't require separate verification"""
        return self.create_success_result(
            transaction_id=payment_method.id,
            gateway_response={'verified': True}
        )
    
    def remove_payment_method(self, payment_method) -> PaymentProcessorResult:
        """Remove M-Pesa payment method (no API call needed)"""
        return self.create_success_result(
            transaction_id=payment_method.id,
            gateway_response={'removed': True}
        )
    
    def verify_webhook_signature(self, payload: str, signature: str, headers: Dict) -> bool:
        """M-Pesa doesn't use signature verification - validate by IP or other means"""
        # In production, you might want to validate the source IP
        return True
    
    def process_webhook(self, event_type: str, payload: Dict) -> PaymentProcessorResult:
        """Process M-Pesa callback"""
        self.log_debug("Processing M-Pesa webhook", {
            'event_type': event_type,
            'payload_keys': list(payload.keys())
        })
        
        try:
            # M-Pesa STK callback
            if 'stkCallback' in payload:
                return self._handle_stk_callback(payload['stkCallback'])
            
            # M-Pesa B2C callback
            elif 'Result' in payload:
                return self._handle_b2c_callback(payload['Result'])
            
            else:
                self.log_debug("Unknown M-Pesa webhook format")
                return self.create_success_result(
                    transaction_id='',
                    gateway_response={'message': 'Webhook acknowledged but format not recognized'}
                )
        
        except Exception as e:
            self.log_error("Error processing M-Pesa webhook", e)
            return self.create_error_result(
                "Failed to process M-Pesa webhook",
                code='webhook_processing_error'
            )
    
    def _handle_stk_callback(self, callback_data: Dict) -> PaymentProcessorResult:
        """Handle STK push callback"""
        result_code = callback_data.get('ResultCode')
        checkout_request_id = callback_data.get('CheckoutRequestID')
        
        if result_code == 0:
            # Payment successful
            callback_metadata = callback_data.get('CallbackMetadata', {})
            items = callback_metadata.get('Item', [])
            
            # Extract payment details
            payment_details = {}
            for item in items:
                name = item.get('Name')
                value = item.get('Value')
                payment_details[name] = value
            
            return self.create_success_result(
                transaction_id=checkout_request_id,
                gateway_response={
                    'result_code': result_code,
                    'result_desc': callback_data.get('ResultDesc'),
                    'payment_details': payment_details
                }
            )
        else:
            # Payment failed or cancelled
            return self.create_error_result(
                callback_data.get('ResultDesc', 'Payment failed'),
                code=f'mpesa_error_{result_code}',
                gateway_response=callback_data
            )
    
    def _handle_b2c_callback(self, result_data: Dict) -> PaymentProcessorResult:
        """Handle B2C callback"""
        result_code = result_data.get('ResultCode')
        conversation_id = result_data.get('ConversationID')
        
        if result_code == 0:
            return self.create_success_result(
                transaction_id=conversation_id,
                gateway_response=result_data
            )
        else:
            return self.create_error_result(
                result_data.get('ResultDesc', 'B2C payment failed'),
                code=f'mpesa_b2c_error_{result_code}',
                gateway_response=result_data
            )
    
    def get_transaction_status(self, gateway_transaction_id: str) -> PaymentProcessorResult:
        """Query STK push status"""
        try:
            access_token = self.get_access_token()
            password, timestamp = self.generate_password()
            
            query_data = {
                "BusinessShortCode": self.business_short_code,
                "Password": password,
                "Timestamp": timestamp,
                "CheckoutRequestID": gateway_transaction_id
            }
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(self.stk_query_url, json=query_data, headers=headers)
            response_data = response.json()
            
            return self.create_success_result(
                transaction_id=gateway_transaction_id,
                gateway_response=response_data
            )
            
        except Exception as e:
            self.log_error("Error querying M-Pesa transaction status", e)
            return self.create_error_result(
                "Failed to query transaction status",
                code='status_query_failed'
            )
    
    def get_supported_currencies(self) -> list:
        """M-Pesa only supports Kenyan Shillings"""
        return ['KES']
    
    def get_supported_countries(self) -> list:
        """M-Pesa is available in Kenya"""
        return ['KE']
    
    def validate_credentials(self) -> bool:
        """Validate M-Pesa API credentials"""
        try:
            self.get_access_token()
            return True
        except Exception:
            return False
    
    def calculate_fees(self, amount: Decimal, currency: str = 'KES') -> Dict[str, Decimal]:
        """Calculate M-Pesa transaction fees"""
        # M-Pesa fees are tiered based on amount
        # These are approximate fees - check current Safaricom rates
        amount = float(amount)
        
        if amount <= 100:
            fee = Decimal('0')
        elif amount <= 500:
            fee = Decimal('7')
        elif amount <= 1000:
            fee = Decimal('13')
        elif amount <= 1500:
            fee = Decimal('23')
        elif amount <= 2500:
            fee = Decimal('33')
        elif amount <= 3500:
            fee = Decimal('53')
        elif amount <= 5000:
            fee = Decimal('57')
        elif amount <= 7500:
            fee = Decimal('78')
        elif amount <= 10000:
            fee = Decimal('90')
        elif amount <= 15000:
            fee = Decimal('100')
        elif amount <= 20000:
            fee = Decimal('108')
        elif amount <= 25000:
            fee = Decimal('115')
        elif amount <= 30000:
            fee = Decimal('122')
        elif amount <= 35000:
            fee = Decimal('127')
        elif amount <= 40000:
            fee = Decimal('133')
        elif amount <= 45000:
            fee = Decimal('138')
        elif amount <= 50000:
            fee = Decimal('142')
        else:
            # For amounts above 50,000
            fee = Decimal('142')
        
        return {
            'percentage_fee': Decimal('0'),
            'fixed_fee': fee,
            'total_fee': fee,
            'net_amount': Decimal(str(amount)) - fee
        }
    
    # Legacy methods for backward compatibility
    def get_employee_account_form(self):
        """Return form fields needed for M-Pesa"""
        return [
            {'name': 'phone_number', 'type': 'tel', 'required': True, 'label': 'M-Pesa Phone Number'},
        ]
    
    def validate_account_details(self, details):
        """Validate M-Pesa account details"""
        phone_number = details.get('phone_number')
        if not phone_number:
            return False, "Phone number is required for M-Pesa"
        
        # Format phone number
        phone_number = phone_number.strip().replace('+', '')
        if phone_number.startswith('0'):
            phone_number = '254' + phone_number[1:]
        elif not phone_number.startswith('254'):
            phone_number = '254' + phone_number
        
        # Validate
        if not phone_number.isdigit() or len(phone_number) != 12:
            return False, "Invalid Kenyan phone number format"
        
        return True, "M-Pesa account details are valid"

# Backward compatibility alias
Provider = MPesaProcessor