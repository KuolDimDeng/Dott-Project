import os
import requests
import logging
from django.conf import settings
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Service for sending WhatsApp messages via Meta Business API"""
    
    def __init__(self):
        self.access_token = os.environ.get('WHATSAPP_ACCESS_TOKEN')
        self.phone_number_id = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '676188225586230')
        self.api_version = 'v18.0'
        self.base_url = f'https://graph.facebook.com/{self.api_version}'
        
        logger.info('🔧 [WhatsAppService] Initialized with:')
        logger.info(f'   - Access token present: {bool(self.access_token)}')
        logger.info(f'   - Access token length: {len(self.access_token) if self.access_token else 0}')
        logger.info(f'   - Phone number ID: {self.phone_number_id}')
        logger.info(f'   - API version: {self.api_version}')
        logger.info(f'   - Base URL: {self.base_url}')
        
    def is_configured(self) -> bool:
        """Check if WhatsApp service is properly configured"""
        configured = bool(self.access_token)
        logger.info(f'[WhatsAppService] is_configured() = {configured}')
        return configured
    
    def send_text_message(self, to_number: str, message: str) -> Optional[Dict[str, Any]]:
        """
        Send a text message via WhatsApp
        
        Args:
            to_number: Recipient's phone number with country code (e.g., '+1234567890')
            message: Text message to send
            
        Returns:
            Response data from WhatsApp API or None if failed
        """
        logger.info('📱 [WhatsAppService] === SEND TEXT MESSAGE ===')
        logger.info(f'[WhatsAppService] To: {to_number}')
        logger.info(f'[WhatsAppService] Message length: {len(message)}')
        
        if not self.is_configured():
            logger.warning("[WhatsAppService] ❌ Not configured - missing access token")
            return None
            
        # Clean the phone number - remove any non-digit characters except +
        cleaned_number = ''.join(c for c in to_number if c.isdigit() or c == '+')
        # Remove the + for the API
        cleaned_number = cleaned_number.lstrip('+')
        
        logger.info(f'[WhatsAppService] Phone cleaned: {to_number} -> {cleaned_number}')
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        logger.info(f'[WhatsAppService] API URL: {url}')
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'messaging_product': 'whatsapp',
            'to': cleaned_number,
            'type': 'text',
            'text': {
                'body': message
            }
        }
        
        logger.info(f'[WhatsAppService] Request data: {data}')
        logger.info(f'[WhatsAppService] Auth header length: {len(headers["Authorization"])}')
        
        try:
            logger.info('[WhatsAppService] Sending request to Meta API...')
            response = requests.post(url, json=data, headers=headers)
            
            logger.info(f'[WhatsAppService] Response status: {response.status_code}')
            logger.info(f'[WhatsAppService] Response headers: {dict(response.headers)}')
            
            response_text = response.text
            logger.info(f'[WhatsAppService] Response body: {response_text[:500]}...')
            
            response.raise_for_status()
            
            result = response.json()
            message_id = result.get('messages', [{}])[0].get('id')
            logger.info(f"[WhatsAppService] ✅ Message sent successfully!")
            logger.info(f"[WhatsAppService] Message ID: {message_id}")
            logger.info(f"[WhatsAppService] Full response: {result}")
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"[WhatsAppService] ❌ Failed to send WhatsApp message: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"[WhatsAppService] Error status: {e.response.status_code}")
                logger.error(f"[WhatsAppService] Error response: {e.response.text}")
                logger.error(f"[WhatsAppService] Error headers: {dict(e.response.headers)}")
            return None
    
    def send_template_message(self, to_number: str, template_name: str, parameters: list = None, language_code: str = 'en_US') -> Optional[Dict[str, Any]]:
        """
        Send a WhatsApp template message
        
        Args:
            to_number: Recipient's phone number with country code
            template_name: Name of the approved WhatsApp template
            parameters: List of parameter values for the template
            language_code: Language code for the template (default: en_US)
            
        Returns:
            Response data from WhatsApp API or None if failed
        """
        if not self.is_configured():
            logger.warning("WhatsApp service not configured - missing access token")
            return None
            
        cleaned_number = ''.join(c for c in to_number if c.isdigit() or c == '+').lstrip('+')
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'messaging_product': 'whatsapp',
            'to': cleaned_number,
            'type': 'template',
            'template': {
                'name': template_name,
                'language': {
                    'code': language_code
                }
            }
        }
        
        # Add parameters if provided
        if parameters:
            data['template']['components'] = [{
                'type': 'body',
                'parameters': [{'type': 'text', 'text': param} for param in parameters]
            }]
        
        try:
            response = requests.post(url, json=data, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"WhatsApp template message '{template_name}' sent to {to_number}")
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send WhatsApp template message to {to_number}: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Error response: {e.response.text}")
            return None


# Singleton instance
whatsapp_service = WhatsAppService()