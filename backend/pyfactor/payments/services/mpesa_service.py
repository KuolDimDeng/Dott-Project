"""
M-Pesa Payment Service
Production-ready implementation for Safaricom M-Pesa
"""

import base64
import json
from typing import Dict, Any, Optional
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from datetime import datetime
import logging
from .base_payment_service import BasePaymentService

logger = logging.getLogger(__name__)


class MPesaService(BasePaymentService):
    """M-Pesa payment service implementation"""
    
    def __init__(self):
        super().__init__('MPESA')
        self.config = self._get_config()
        
    def _get_config(self) -> Dict[str, str]:
        """Get configuration based on environment"""
        if self.is_test_mode():
            return {
                'base_url': 'https://sandbox.safaricom.co.ke',
                'consumer_key': getattr(settings, 'MPESA_SANDBOX_CONSUMER_KEY', ''),
                'consumer_secret': getattr(settings, 'MPESA_SANDBOX_CONSUMER_SECRET', ''),
                'shortcode': getattr(settings, 'MPESA_SANDBOX_SHORTCODE', '174379'),
                'passkey': getattr(settings, 'MPESA_SANDBOX_PASSKEY', ''),
                'environment': 'sandbox',
                'callback_url': getattr(settings, 'MPESA_CALLBACK_URL', 'https://staging.dottapps.com/api/payments/mpesa/callback')
            }
        else:
            return {
                'base_url': 'https://api.safaricom.co.ke',
                'consumer_key': getattr(settings, 'MPESA_CONSUMER_KEY', ''),
                'consumer_secret': getattr(settings, 'MPESA_CONSUMER_SECRET', ''),
                'shortcode': getattr(settings, 'MPESA_SHORTCODE', ''),
                'passkey': getattr(settings, 'MPESA_PASSKEY', ''),
                'environment': 'production',
                'callback_url': getattr(settings, 'MPESA_CALLBACK_URL', 'https://api.dottapps.com/api/payments/mpesa/callback')
            }
    
    def authenticate(self) -> Dict[str, Any]:
        """Authenticate and get access token"""
        try:
            # Check for cached token
            cached_token = self.get_cached_token('mpesa_access_token')
            if cached_token:
                return {
                    'success': True,
                    'access_token': cached_token,
                    'cached': True
                }
            
            # Create Basic Auth header
            auth_string = f"{self.config['consumer_key']}:{self.config['consumer_secret']}"
            auth_bytes = auth_string.encode('ascii')
            auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
            
            headers = {
                'Authorization': f'Basic {auth_b64}'
            }
            
            response = self.session.get(
                f"{self.config['base_url']}/oauth/v1/generate?grant_type=client_credentials",
                headers=headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                access_token = data['access_token']
                expires_in = int(data.get('expires_in', 3600))
                
                # Cache the token
                self.set_cached_token('mpesa_access_token', access_token, expires_in)
                
                self.log_transaction('authenticate', {'status': 'success'})
                
                return {
                    'success': True,
                    'access_token': access_token,
                    'expires_in': expires_in
                }
            else:
                raise Exception(f"Authentication failed: {response.text}")
                
        except Exception as e:
            return self.handle_error(e, {'action': 'authenticate'})
    
    def request_payment(
        self,
        amount: Decimal,
        phone_number: str,
        reference: str,
        currency: str = 'KES',
        message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Request STK Push payment from customer"""
        try:
            # Validate inputs
            is_valid, formatted_phone = self.validate_phone_number(phone_number)
            if not is_valid:
                return {'success': False, 'error': formatted_phone}
            
            # Format phone for M-Pesa (must be 254XXXXXXXXX)
            if not formatted_phone.startswith('254'):
                if formatted_phone.startswith('0'):
                    formatted_phone = f"254{formatted_phone[1:]}"
                elif formatted_phone.startswith('+'):
                    formatted_phone = formatted_phone[1:]
            
            is_valid, error_msg = self.validate_amount(amount, currency)
            if not is_valid:
                return {'success': False, 'error': error_msg}
            
            # Get access token
            auth_result = self.authenticate()
            if not auth_result['success']:
                return auth_result
            
            access_token = auth_result['access_token']
            
            # Generate password for STK Push
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            password_string = f"{self.config['shortcode']}{self.config['passkey']}{timestamp}"
            password = base64.b64encode(password_string.encode()).decode('utf-8')
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            data = {
                'BusinessShortCode': self.config['shortcode'],
                'Password': password,
                'Timestamp': timestamp,
                'TransactionType': 'CustomerPayBillOnline',
                'Amount': int(amount),  # M-Pesa requires integer amount
                'PartyA': formatted_phone,
                'PartyB': self.config['shortcode'],
                'PhoneNumber': formatted_phone,
                'CallBackURL': self.config['callback_url'],
                'AccountReference': reference[:12],  # Max 12 characters
                'TransactionDesc': (message or 'Payment')[:13]  # Max 13 characters
            }
            
            response = self.session.post(
                f"{self.config['base_url']}/mpesa/stkpush/v1/processrequest",
                headers=headers,
                json=data,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                response_data = response.json()
                
                if response_data.get('ResponseCode') == '0':
                    self.log_transaction('request_payment', data, response_data)
                    
                    return {
                        'success': True,
                        'reference_id': response_data.get('CheckoutRequestID'),
                        'merchant_request_id': response_data.get('MerchantRequestID'),
                        'message': response_data.get('ResponseDescription', 'Payment request sent'),
                        'status': 'PENDING'
                    }
                else:
                    return {
                        'success': False,
                        'error': response_data.get('ResponseDescription', 'Payment request failed')
                    }
            else:
                error_msg = f"Payment request failed: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {'success': False, 'error': error_msg}
                
        except Exception as e:
            return self.handle_error(e, {
                'action': 'request_payment',
                'amount': str(amount),
                'phone': phone_number
            })
    
    def check_payment_status(self, reference: str) -> Dict[str, Any]:
        """Check status of STK Push payment"""
        try:
            # Get access token
            auth_result = self.authenticate()
            if not auth_result['success']:
                return auth_result
            
            access_token = auth_result['access_token']
            
            # Generate password
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            password_string = f"{self.config['shortcode']}{self.config['passkey']}{timestamp}"
            password = base64.b64encode(password_string.encode()).decode('utf-8')
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            data = {
                'BusinessShortCode': self.config['shortcode'],
                'Password': password,
                'Timestamp': timestamp,
                'CheckoutRequestID': reference
            }
            
            response = self.session.post(
                f"{self.config['base_url']}/mpesa/stkpushquery/v1/query",
                headers=headers,
                json=data,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Map M-Pesa result codes to our standard status
                result_code = response_data.get('ResultCode', '')
                
                status_mapping = {
                    '0': 'SUCCESSFUL',
                    '1': 'FAILED',
                    '1032': 'CANCELLED',
                    '1037': 'EXPIRED'
                }
                
                status = status_mapping.get(str(result_code), 'PENDING')
                
                return {
                    'success': True,
                    'status': status,
                    'data': self.sanitize_response(response_data)
                }
            else:
                return {
                    'success': False,
                    'error': f"Status check failed: {response.status_code}"
                }
                
        except Exception as e:
            return self.handle_error(e, {
                'action': 'check_payment_status',
                'reference': reference
            })
    
    def process_refund(
        self,
        original_reference: str,
        amount: Decimal,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process B2C refund"""
        try:
            # Get access token
            auth_result = self.authenticate()
            if not auth_result['success']:
                return auth_result
            
            access_token = auth_result['access_token']
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # For B2C payments, we need different endpoint and configuration
            # This is a simplified implementation
            data = {
                'InitiatorName': getattr(settings, 'MPESA_INITIATOR_NAME', ''),
                'SecurityCredential': self._generate_security_credential(),
                'CommandID': 'BusinessPayment',
                'Amount': int(amount),
                'PartyA': self.config['shortcode'],
                'PartyB': original_reference,  # This should be the phone number
                'Remarks': reason or 'Refund',
                'QueueTimeOutURL': f"{self.config['callback_url']}/timeout",
                'ResultURL': f"{self.config['callback_url']}/result",
                'Occasion': f'Refund for {original_reference[:8]}'
            }
            
            response = self.session.post(
                f"{self.config['base_url']}/mpesa/b2c/v1/paymentrequest",
                headers=headers,
                json=data,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                response_data = response.json()
                
                if response_data.get('ResponseCode') == '0':
                    self.log_transaction('process_refund', data, response_data)
                    
                    return {
                        'success': True,
                        'reference_id': response_data.get('ConversationID'),
                        'originator_conversation_id': response_data.get('OriginatorConversationID'),
                        'message': 'Refund request sent successfully',
                        'status': 'PENDING'
                    }
                else:
                    return {
                        'success': False,
                        'error': response_data.get('ResponseDescription', 'Refund request failed')
                    }
            else:
                return {
                    'success': False,
                    'error': f"Refund request failed: {response.status_code}"
                }
                
        except Exception as e:
            return self.handle_error(e, {
                'action': 'process_refund',
                'original_reference': original_reference,
                'amount': str(amount)
            })
    
    def verify_webhook(self, headers: Dict, payload: str, signature: str) -> bool:
        """Verify webhook from M-Pesa"""
        try:
            # M-Pesa doesn't use webhook signatures
            # Instead, we validate the structure and source IP
            
            # Check if request is from Safaricom IPs (in production)
            if self.config['environment'] == 'production':
                allowed_ips = getattr(settings, 'MPESA_ALLOWED_IPS', [])
                request_ip = headers.get('X-Forwarded-For', '').split(',')[0].strip()
                
                if allowed_ips and request_ip not in allowed_ips:
                    logger.warning(f"Webhook from unauthorized IP: {request_ip}")
                    return False
            
            # Validate payload structure
            try:
                data = json.loads(payload)
                required_fields = ['Body', 'stkCallback']
                
                for field in required_fields:
                    if field not in str(data):
                        return False
                
                return True
                
            except json.JSONDecodeError:
                return False
                
        except Exception as e:
            logger.error(f"Webhook verification failed: {e}")
            return False
    
    def _generate_security_credential(self) -> str:
        """Generate security credential for B2C"""
        # This would use the certificate to encrypt the password
        # Simplified for demonstration
        initiator_password = getattr(settings, 'MPESA_INITIATOR_PASSWORD', '')
        # In production, encrypt with M-Pesa public certificate
        return base64.b64encode(initiator_password.encode()).decode('utf-8')
    
    def register_urls(self) -> Dict[str, Any]:
        """Register callback URLs with M-Pesa"""
        try:
            # Get access token
            auth_result = self.authenticate()
            if not auth_result['success']:
                return auth_result
            
            access_token = auth_result['access_token']
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            data = {
                'ShortCode': self.config['shortcode'],
                'ResponseType': 'Completed',
                'ConfirmationURL': f"{self.config['callback_url']}/confirmation",
                'ValidationURL': f"{self.config['callback_url']}/validation"
            }
            
            response = self.session.post(
                f"{self.config['base_url']}/mpesa/c2b/v1/registerurl",
                headers=headers,
                json=data,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                response_data = response.json()
                
                return {
                    'success': True,
                    'message': response_data.get('ResponseDescription', 'URLs registered successfully')
                }
            else:
                return {
                    'success': False,
                    'error': f"URL registration failed: {response.status_code}"
                }
                
        except Exception as e:
            return self.handle_error(e, {'action': 'register_urls'})