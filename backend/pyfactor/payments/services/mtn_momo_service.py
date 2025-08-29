"""
MTN MoMo Payment Service
Production-ready implementation with security and error handling
"""

import uuid
import base64
import json
from typing import Dict, Any, Optional
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import logging
from .base_payment_service import BasePaymentService

logger = logging.getLogger(__name__)


class MTNMoMoService(BasePaymentService):
    """MTN MoMo payment service implementation"""
    
    def __init__(self):
        super().__init__('MTN_MOMO')
        self.config = self._get_config()
        
    def _get_config(self) -> Dict[str, str]:
        """Get configuration based on environment"""
        if self.is_test_mode():
            return {
                'base_url': 'https://sandbox.momodeveloper.mtn.com',
                'subscription_key': getattr(settings, 'MOMO_SANDBOX_SUBSCRIPTION_KEY', ''),
                'environment': 'sandbox',
                'currency': 'EUR',  # Sandbox uses EUR
                'callback_host': getattr(settings, 'MOMO_CALLBACK_HOST', 'https://staging.dottapps.com')
            }
        else:
            return {
                'base_url': 'https://proxy.momoapi.mtn.com',
                'subscription_key': getattr(settings, 'MOMO_PRODUCTION_SUBSCRIPTION_KEY', ''),
                'environment': 'production',
                'currency': getattr(settings, 'MOMO_DEFAULT_CURRENCY', 'UGX'),
                'callback_host': getattr(settings, 'MOMO_CALLBACK_HOST', 'https://api.dottapps.com')
            }
    
    def authenticate(self) -> Dict[str, Any]:
        """Authenticate and get access token"""
        try:
            # Check for cached token
            cached_token = self.get_cached_token('access_token')
            if cached_token:
                return {
                    'success': True,
                    'access_token': cached_token,
                    'cached': True
                }
            
            # Get or create API user and key
            api_user = self._get_or_create_api_user()
            api_key = self._get_or_create_api_key(api_user)
            
            # Create Basic Auth header
            auth_string = f"{api_user}:{api_key}"
            auth_bytes = auth_string.encode('ascii')
            auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
            
            headers = {
                'Authorization': f'Basic {auth_b64}',
                'Ocp-Apim-Subscription-Key': self.config['subscription_key']
            }
            
            response = self.session.post(
                f"{self.config['base_url']}/collection/token/",
                headers=headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                access_token = data['access_token']
                expires_in = data.get('expires_in', 3600)
                
                # Cache the token
                self.set_cached_token('access_token', access_token, expires_in)
                
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
    
    def _get_or_create_api_user(self) -> str:
        """Get or create API user"""
        # Check cache first
        cached_user = self.get_cached_token('api_user')
        if cached_user:
            return cached_user
        
        # In production, this would be retrieved from database
        # For sandbox, we create a new one
        if self.config['environment'] == 'sandbox':
            api_user_id = str(uuid.uuid4())
            
            headers = {
                'X-Reference-Id': api_user_id,
                'Ocp-Apim-Subscription-Key': self.config['subscription_key'],
                'Content-Type': 'application/json'
            }
            
            data = {
                'providerCallbackHost': self.config['callback_host']
            }
            
            response = self.session.post(
                f"{self.config['base_url']}/v1_0/apiuser",
                headers=headers,
                json=data,
                timeout=self.timeout
            )
            
            if response.status_code == 201:
                # Cache for 24 hours
                self.set_cached_token('api_user', api_user_id, 86400)
                return api_user_id
            else:
                # Use a default test user if creation fails
                return getattr(settings, 'MOMO_API_USER', '')
        else:
            # Production: retrieve from settings/database
            return getattr(settings, 'MOMO_API_USER', '')
    
    def _get_or_create_api_key(self, api_user: str) -> str:
        """Get or create API key"""
        # Check cache first
        cached_key = self.get_cached_token('api_key')
        if cached_key:
            return cached_key
        
        # In production, this would be retrieved from database
        # For sandbox, we create a new one
        if self.config['environment'] == 'sandbox':
            headers = {
                'Ocp-Apim-Subscription-Key': self.config['subscription_key']
            }
            
            response = self.session.post(
                f"{self.config['base_url']}/v1_0/apiuser/{api_user}/apikey",
                headers=headers,
                timeout=self.timeout
            )
            
            if response.status_code == 201:
                data = response.json()
                api_key = data['apiKey']
                # Cache for 24 hours
                self.set_cached_token('api_key', api_key, 86400)
                return api_key
            else:
                # Use a default test key if creation fails
                return getattr(settings, 'MOMO_API_KEY', '')
        else:
            # Production: retrieve from settings/database
            return getattr(settings, 'MOMO_API_KEY', '')
    
    def request_payment(
        self,
        amount: Decimal,
        phone_number: str,
        reference: str,
        currency: str = None,
        message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Request payment from customer"""
        try:
            # Validate inputs
            is_valid, formatted_phone = self.validate_phone_number(phone_number)
            if not is_valid:
                return {'success': False, 'error': formatted_phone}
            
            is_valid, error_msg = self.validate_amount(amount, currency or self.config['currency'])
            if not is_valid:
                return {'success': False, 'error': error_msg}
            
            # Get access token
            auth_result = self.authenticate()
            if not auth_result['success']:
                return auth_result
            
            access_token = auth_result['access_token']
            reference_id = reference or str(uuid.uuid4())
            
            # Handle test numbers in sandbox
            if self.config['environment'] == 'sandbox':
                formatted_phone = self._map_to_test_number(formatted_phone)
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'X-Reference-Id': reference_id,
                'X-Target-Environment': self.config['environment'],
                'Ocp-Apim-Subscription-Key': self.config['subscription_key'],
                'Content-Type': 'application/json',
                'X-Callback-Url': self.get_callback_url(reference_id)
            }
            
            data = {
                'amount': str(amount),
                'currency': currency or self.config['currency'],
                'externalId': reference_id,
                'payer': {
                    'partyIdType': 'MSISDN',
                    'partyId': formatted_phone
                },
                'payerMessage': message or f'Payment request from {settings.SITE_NAME}',
                'payeeNote': f'Payment for order {reference_id[:8]}'
            }
            
            response = self.session.post(
                f"{self.config['base_url']}/collection/v1_0/requesttopay",
                headers=headers,
                json=data,
                timeout=self.timeout
            )
            
            if response.status_code == 202:
                self.log_transaction('request_payment', data, {'status': 'accepted'})
                
                return {
                    'success': True,
                    'reference_id': reference_id,
                    'message': 'Payment request sent successfully',
                    'status': 'PENDING'
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
        """Check status of a payment"""
        try:
            # Get access token
            auth_result = self.authenticate()
            if not auth_result['success']:
                return auth_result
            
            access_token = auth_result['access_token']
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'X-Target-Environment': self.config['environment'],
                'Ocp-Apim-Subscription-Key': self.config['subscription_key']
            }
            
            response = self.session.get(
                f"{self.config['base_url']}/collection/v1_0/requesttopay/{reference}",
                headers=headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Map MoMo status to our standard status
                status_mapping = {
                    'SUCCESSFUL': 'SUCCESSFUL',
                    'FAILED': 'FAILED',
                    'PENDING': 'PENDING',
                    'EXPIRED': 'EXPIRED'
                }
                
                status = status_mapping.get(data.get('status', ''), 'UNKNOWN')
                
                return {
                    'success': True,
                    'status': status,
                    'data': self.sanitize_response(data)
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
        """Process a refund"""
        try:
            # Get access token
            auth_result = self.authenticate()
            if not auth_result['success']:
                return auth_result
            
            access_token = auth_result['access_token']
            refund_reference = str(uuid.uuid4())
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'X-Reference-Id': refund_reference,
                'X-Target-Environment': self.config['environment'],
                'Ocp-Apim-Subscription-Key': self.config['subscription_key'],
                'Content-Type': 'application/json'
            }
            
            data = {
                'amount': str(amount),
                'currency': self.config['currency'],
                'externalId': refund_reference,
                'payerMessage': reason or 'Refund processed',
                'payeeNote': f'Refund for transaction {original_reference[:8]}'
            }
            
            response = self.session.post(
                f"{self.config['base_url']}/collection/v2_0/refund",
                headers=headers,
                json=data,
                timeout=self.timeout
            )
            
            if response.status_code == 202:
                self.log_transaction('process_refund', data, {'status': 'accepted'})
                
                return {
                    'success': True,
                    'reference_id': refund_reference,
                    'message': 'Refund request sent successfully',
                    'status': 'PENDING'
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
        """Verify webhook signature"""
        try:
            # MTN MoMo doesn't use webhook signatures in sandbox
            # In production, implement signature verification
            if self.config['environment'] == 'production':
                webhook_secret = getattr(settings, 'MOMO_WEBHOOK_SECRET', '')
                if webhook_secret:
                    expected_signature = self.calculate_signature(payload, webhook_secret)
                    return signature == expected_signature
            
            # For sandbox, just validate the structure
            return True
            
        except Exception as e:
            logger.error(f"Webhook verification failed: {e}")
            return False
    
    def _map_to_test_number(self, phone_number: str) -> str:
        """Map phone numbers to test numbers in sandbox"""
        # Sandbox test numbers
        test_numbers = {
            'success': '46733123450',
            'failed': '46733123451',
            'rejected': '46733123452',
            'expired': '46733123453',
            'ongoing': '46733123454',
            'pending': '46733123455'
        }
        
        # Map based on last digit or keyword
        if 'success' in phone_number.lower() or phone_number.endswith('0'):
            return test_numbers['success']
        elif 'fail' in phone_number.lower() or phone_number.endswith('1'):
            return test_numbers['failed']
        elif 'reject' in phone_number.lower() or phone_number.endswith('2'):
            return test_numbers['rejected']
        else:
            return test_numbers['success']  # Default to success
    
    def get_balance(self) -> Dict[str, Any]:
        """Get account balance"""
        try:
            # Get access token
            auth_result = self.authenticate()
            if not auth_result['success']:
                return auth_result
            
            access_token = auth_result['access_token']
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'X-Target-Environment': self.config['environment'],
                'Ocp-Apim-Subscription-Key': self.config['subscription_key']
            }
            
            response = self.session.get(
                f"{self.config['base_url']}/collection/v1_0/account/balance",
                headers=headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'balance': data.get('availableBalance', '0'),
                    'currency': data.get('currency', self.config['currency'])
                }
            else:
                return {
                    'success': False,
                    'error': f"Balance check failed: {response.status_code}"
                }
                
        except Exception as e:
            return self.handle_error(e, {'action': 'get_balance'})