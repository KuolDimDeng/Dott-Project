"""
MTN MoMo Payment Service for Dott
Handles MTN Mobile Money integration for African markets
"""

import uuid
import base64
import requests
from django.conf import settings
from django.core.cache import cache
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class MoMoService:
    """Service for handling MTN MoMo payments"""
    
    def __init__(self):
        # Sandbox configuration
        self.sandbox_config = {
            'base_url': 'https://sandbox.momodeveloper.mtn.com',
            'subscription_key': '326d22e6674c4d0e93831b138f4d6407',  # Your key
            'environment': 'sandbox',
            'currency': 'EUR',  # Sandbox uses EUR
            'callback_url': 'https://staging.dottapps.com/api/momo/webhook/'
        }
        
        # Production configuration (to be updated)
        self.production_config = {
            'base_url': 'https://proxy.momoapi.mtn.com',
            'subscription_key': settings.MOMO_SUBSCRIPTION_KEY if hasattr(settings, 'MOMO_SUBSCRIPTION_KEY') else '',
            'environment': 'production',
            'currency': 'UGX',  # Or appropriate currency
            'callback_url': 'https://api.dottapps.com/api/momo/webhook/'
        }
        
        # Use sandbox for now
        self.config = self.sandbox_config
        self.api_user = None
        self.api_key = None
        self.access_token = None
        
    def create_api_user(self):
        """Create API User for sandbox"""
        api_user_id = str(uuid.uuid4())
        
        headers = {
            'X-Reference-Id': api_user_id,
            'Ocp-Apim-Subscription-Key': self.config['subscription_key'],
            'Content-Type': 'application/json'
        }
        
        data = {
            'providerCallbackHost': 'dottapps.com'
        }
        
        try:
            response = requests.post(
                f"{self.config['base_url']}/v1_0/apiuser",
                headers=headers,
                json=data
            )
            
            if response.status_code == 201:
                self.api_user = api_user_id
                cache.set('momo_api_user', api_user_id, 86400)  # Cache for 24 hours
                logger.info(f"Created MoMo API User: {api_user_id}")
                return {'success': True, 'api_user': api_user_id}
            else:
                logger.error(f"Failed to create API User: {response.text}")
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Error creating API User: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def generate_api_key(self, api_user=None):
        """Generate API Key for the user"""
        if not api_user:
            api_user = cache.get('momo_api_user') or self.api_user
            
        if not api_user:
            return {'success': False, 'error': 'API User not found. Create user first.'}
        
        headers = {
            'Ocp-Apim-Subscription-Key': self.config['subscription_key']
        }
        
        try:
            response = requests.post(
                f"{self.config['base_url']}/v1_0/apiuser/{api_user}/apikey",
                headers=headers
            )
            
            if response.status_code == 201:
                data = response.json()
                self.api_key = data['apiKey']
                cache.set('momo_api_key', self.api_key, 86400)  # Cache for 24 hours
                logger.info("Generated MoMo API Key successfully")
                return {'success': True, 'api_key': self.api_key}
            else:
                logger.error(f"Failed to generate API Key: {response.text}")
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Error generating API Key: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_access_token(self):
        """Get OAuth access token"""
        api_user = cache.get('momo_api_user') or self.api_user
        api_key = cache.get('momo_api_key') or self.api_key
        
        if not api_user or not api_key:
            # Try to get from cache or create new ones
            if not api_user:
                result = self.create_api_user()
                if not result['success']:
                    return result
                api_user = result['api_user']
            
            if not api_key:
                result = self.generate_api_key(api_user)
                if not result['success']:
                    return result
                api_key = result['api_key']
        
        # Create Basic Auth header
        auth_string = f"{api_user}:{api_key}"
        auth_bytes = auth_string.encode('ascii')
        auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
        
        headers = {
            'Authorization': f'Basic {auth_b64}',
            'Ocp-Apim-Subscription-Key': self.config['subscription_key']
        }
        
        try:
            response = requests.post(
                f"{self.config['base_url']}/collection/token/",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data['access_token']
                expires_in = data.get('expires_in', 3600)
                
                # Cache token for slightly less than expiry time
                cache.set('momo_access_token', self.access_token, expires_in - 60)
                logger.info(f"Got MoMo access token, expires in {expires_in} seconds")
                
                return {
                    'success': True, 
                    'access_token': self.access_token,
                    'expires_in': expires_in
                }
            else:
                logger.error(f"Failed to get access token: {response.text}")
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Error getting access token: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def request_payment(self, amount, phone, currency='EUR', reference=None, message=None):
        """Request payment from customer"""
        # Get or refresh access token
        access_token = cache.get('momo_access_token') or self.access_token
        if not access_token:
            token_result = self.get_access_token()
            if not token_result['success']:
                return token_result
            access_token = token_result['access_token']
        
        reference_id = reference or str(uuid.uuid4())
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'X-Reference-Id': reference_id,
            'X-Target-Environment': self.config['environment'],
            'Ocp-Apim-Subscription-Key': self.config['subscription_key'],
            'Content-Type': 'application/json',
            'X-Callback-Url': self.config['callback_url']
        }
        
        # In sandbox, use test phone numbers
        if self.config['environment'] == 'sandbox':
            # Map common phone formats to sandbox test numbers
            if 'success' in phone.lower() or phone == '256700000000':
                phone = '46733123450'  # Success test number
            elif 'fail' in phone.lower():
                phone = '46733123451'  # Failed test number
        
        data = {
            'amount': str(amount),
            'currency': currency if self.config['environment'] == 'production' else 'EUR',
            'externalId': reference_id,
            'payer': {
                'partyIdType': 'MSISDN',
                'partyId': phone
            },
            'payerMessage': message or 'Payment request from Dott',
            'payeeNote': f'Payment for order {reference_id[:8]}'
        }
        
        try:
            response = requests.post(
                f"{self.config['base_url']}/collection/v1_0/requesttopay",
                headers=headers,
                json=data
            )
            
            if response.status_code == 202:
                logger.info(f"Payment request sent successfully: {reference_id}")
                
                # Store payment request for tracking
                cache.set(f'momo_payment_{reference_id}', {
                    'amount': amount,
                    'phone': phone,
                    'currency': currency,
                    'status': 'PENDING',
                    'created_at': datetime.now().isoformat()
                }, 3600)  # Cache for 1 hour
                
                return {
                    'success': True,
                    'reference_id': reference_id,
                    'message': 'Payment request sent successfully'
                }
            else:
                logger.error(f"Failed to request payment: {response.text}")
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Error requesting payment: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def check_payment_status(self, reference_id):
        """Check status of a payment request"""
        access_token = cache.get('momo_access_token') or self.access_token
        if not access_token:
            token_result = self.get_access_token()
            if not token_result['success']:
                return token_result
            access_token = token_result['access_token']
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'X-Target-Environment': self.config['environment'],
            'Ocp-Apim-Subscription-Key': self.config['subscription_key']
        }
        
        try:
            response = requests.get(
                f"{self.config['base_url']}/collection/v1_0/requesttopay/{reference_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Update cache
                payment_cache = cache.get(f'momo_payment_{reference_id}')
                if payment_cache:
                    payment_cache['status'] = data['status']
                    cache.set(f'momo_payment_{reference_id}', payment_cache, 3600)
                
                logger.info(f"Payment status for {reference_id}: {data['status']}")
                return {'success': True, 'data': data}
            else:
                logger.error(f"Failed to check payment status: {response.text}")
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Error checking payment status: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_balance(self):
        """Get account balance"""
        access_token = cache.get('momo_access_token') or self.access_token
        if not access_token:
            token_result = self.get_access_token()
            if not token_result['success']:
                return token_result
            access_token = token_result['access_token']
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'X-Target-Environment': self.config['environment'],
            'Ocp-Apim-Subscription-Key': self.config['subscription_key']
        }
        
        try:
            response = requests.get(
                f"{self.config['base_url']}/collection/v1_0/account/balance",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Account balance: {data['currency']} {data['availableBalance']}")
                return {'success': True, 'data': data}
            else:
                logger.error(f"Failed to get balance: {response.text}")
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"Error getting balance: {str(e)}")
            return {'success': False, 'error': str(e)}


# Initialize service
momo_service = MoMoService()