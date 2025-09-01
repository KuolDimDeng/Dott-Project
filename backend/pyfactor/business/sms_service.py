# SMS Service for Business Contact using Africa's Talking API
import requests
import logging
import os
from django.conf import settings
from typing import Dict, Any, Optional
import json

logger = logging.getLogger(__name__)

class AfricasTalkingSMSService:
    """
    SMS service using Africa's Talking API for contacting placeholder businesses
    Supports Kenya (+254), Uganda (+256), Tanzania (+255), Nigeria (+234), etc.
    """
    
    def __init__(self):
        self.api_key = getattr(settings, 'AFRICAS_TALKING_API_KEY', '')
        self.username = getattr(settings, 'AFRICAS_TALKING_USERNAME', 'sandbox')  # Use 'sandbox' for testing
        self.sender_id = getattr(settings, 'SMS_SENDER_ID', 'DOTT')
        self.base_url = 'https://api.africastalking.com/version1/messaging'
        
        if not self.api_key:
            logger.warning("Africa's Talking API key not configured")
    
    def send_business_contact_sms(
        self, 
        business_phone: str,
        business_name: str,
        customer_name: str,
        customer_request: str,
        business_id: str,
        business_address: str = "",
        business_category: str = ""
    ) -> Dict[str, Any]:
        """
        Send SMS to placeholder business about customer interest
        
        Args:
            business_phone: Business phone number with country code (+254...)
            business_name: Name of the business
            customer_name: Name of the customer making request
            customer_request: What customer wants to order/ask
            business_id: Placeholder business ID for tracking
            business_address: Business address (optional)
            business_category: Business category (optional)
            
        Returns:
            Dict with success status, message_id, and delivery info
        """
        
        if not self.api_key:
            return {
                'success': False,
                'error': 'SMS service not configured',
                'code': 'SMS_NOT_CONFIGURED'
            }
        
        # Generate signup URL with hybrid approach context
        signup_url = f"https://app.dottapps.com/signup?ref={business_id}&type=customer-referral&source=sms"
        
        # Create SMS message with hybrid approach - context but no pre-filled data
        message = self._create_business_sms_message(
            business_name=business_name,
            customer_name=customer_name,
            customer_request=customer_request,
            signup_url=signup_url,
            business_address=business_address
        )
        
        try:
            response = self._send_sms(
                phone_number=business_phone,
                message=message
            )
            
            if response['success']:
                logger.info(f"SMS sent to {business_name} ({business_phone}): {response.get('message_id')}")
                
                # Log the contact attempt for analytics
                self._log_business_contact(
                    business_phone=business_phone,
                    business_name=business_name,
                    customer_request=customer_request,
                    message_id=response.get('message_id'),
                    business_id=business_id
                )
                
                return {
                    'success': True,
                    'message_id': response.get('message_id'),
                    'status': response.get('status'),
                    'estimatedDelivery': 'within 1-2 minutes',
                    'cost': response.get('cost', 'Unknown')
                }
            else:
                logger.error(f"SMS failed to {business_phone}: {response.get('error')}")
                return {
                    'success': False,
                    'error': response.get('error', 'SMS delivery failed'),
                    'code': 'SMS_DELIVERY_FAILED'
                }
                
        except Exception as e:
            logger.error(f"SMS service error for {business_phone}: {str(e)}")
            return {
                'success': False,
                'error': f'SMS service error: {str(e)}',
                'code': 'SMS_SERVICE_ERROR'
            }
    
    def _create_business_sms_message(
        self, 
        business_name: str,
        customer_name: str, 
        customer_request: str,
        signup_url: str,
        business_address: str = ""
    ) -> str:
        """
        Create SMS message for hybrid approach - show context but no pre-filled data
        """
        location_text = f"\nLocation: {business_address}" if business_address else ""
        
        message = f"""Hi {business_name}! 📱

A customer is interested in your business:

👤 Customer: {customer_name}
💬 Request: "{customer_request}"{location_text}

🚀 Join Dott to serve this customer and grow your business!

✅ Accept payments (Card, M-Pesa)
✅ Manage orders & inventory  
✅ Reach more customers

👉 Sign up here: {signup_url}

Reply STOP to opt out.
---
Dott Business Platform"""

        return message
    
    def _send_sms(self, phone_number: str, message: str) -> Dict[str, Any]:
        """
        Send SMS via Africa's Talking API
        """
        headers = {
            'apiKey': self.api_key,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        }
        
        data = {
            'username': self.username,
            'to': phone_number,
            'message': message,
            'from': self.sender_id  # Requires pre-approval from Africa's Talking
        }
        
        try:
            response = requests.post(
                self.base_url,
                headers=headers,
                data=data,
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            # Parse Africa's Talking response
            sms_messages = result.get('SMSMessageData', {}).get('Recipients', [])
            
            if sms_messages and len(sms_messages) > 0:
                recipient = sms_messages[0]
                status_code = recipient.get('statusCode')
                
                if status_code == 101:  # Success code for Africa's Talking
                    return {
                        'success': True,
                        'message_id': recipient.get('messageId'),
                        'status': 'Sent',
                        'cost': recipient.get('cost')
                    }
                else:
                    return {
                        'success': False,
                        'error': f"SMS failed with status code: {status_code}",
                        'status_code': status_code
                    }
            else:
                return {
                    'success': False,
                    'error': 'No SMS recipients in response'
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP error sending SMS: {str(e)}")
            return {
                'success': False,
                'error': f'HTTP error: {str(e)}'
            }
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            return {
                'success': False,
                'error': f'Invalid API response: {str(e)}'
            }
    
    def _log_business_contact(
        self, 
        business_phone: str,
        business_name: str, 
        customer_request: str,
        message_id: str,
        business_id: str
    ):
        """
        Log business contact attempt for analytics and follow-up
        In production, this would save to BusinessContactLog model
        """
        log_data = {
            'timestamp': self._get_timestamp(),
            'business_phone': business_phone,
            'business_name': business_name,
            'customer_request': customer_request,
            'message_id': message_id,
            'business_id': business_id,
            'sms_provider': 'africas_talking'
        }
        
        logger.info(f"Business contact logged: {json.dumps(log_data)}")
        
        # TODO: Save to database model for analytics
        # BusinessContactLog.objects.create(**log_data)
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'
    
    def check_delivery_status(self, message_id: str) -> Dict[str, Any]:
        """
        Check SMS delivery status (premium feature)
        """
        # This requires Africa's Talking premium account
        # For now, return basic response
        return {
            'message_id': message_id,
            'status': 'Unknown',
            'note': 'Delivery status checking requires premium account'
        }

# Service instance
sms_service = AfricasTalkingSMSService()