"""
Smart SMS Service with Africa's Talking as primary for African countries
and Twilio as fallback for other regions.
"""

import logging
import random
import os
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

# African country codes where Africa's Talking works best
AFRICAN_COUNTRY_CODES = [
    '+211',  # South Sudan
    '+254',  # Kenya
    '+256',  # Uganda
    '+255',  # Tanzania
    '+234',  # Nigeria
    '+233',  # Ghana
    '+27',   # South Africa
    '+251',  # Ethiopia
    '+250',  # Rwanda
    '+237',  # Cameroon
    '+225',  # Côte d'Ivoire
    '+221',  # Senegal
    '+260',  # Zambia
    '+263',  # Zimbabwe
    '+265',  # Malawi
    '+267',  # Botswana
    '+268',  # Eswatini
    '+258',  # Mozambique
    '+264',  # Namibia
    '+266',  # Lesotho
    '+20',   # Egypt
    '+212',  # Morocco
    '+216',  # Tunisia
    '+213',  # Algeria
    '+218',  # Libya
    '+249',  # Sudan
    '+252',  # Somalia
    '+253',  # Djibouti
    '+291',  # Eritrea
    '+257',  # Burundi
]


class SmartSMSService:
    """
    Smart SMS service that routes messages based on destination.
    Uses Africa's Talking for African numbers, Twilio for others.
    """
    
    def __init__(self):
        # Initialize Africa's Talking
        self.africas_talking_enabled = False
        self.africas_talking_client = None
        
        try:
            import africastalking
            
            username = os.environ.get('AFRICAS_TALKING_USERNAME', 'sandbox')
            api_key = os.environ.get('AFRICAS_TALKING_API_KEY')
            
            if api_key:
                # Initialize Africa's Talking
                africastalking.initialize(username, api_key)
                self.africas_talking_sms = africastalking.SMS
                self.africas_talking_enabled = True
                logger.info("✅ Africa's Talking SMS service initialized")
            else:
                logger.warning("⚠️ Africa's Talking API key not configured")
        except ImportError:
            logger.warning("⚠️ Africa's Talking SDK not installed. Run: pip install africastalking")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Africa's Talking: {str(e)}")
        
        # Initialize Twilio as fallback
        self.twilio_enabled = False
        self.twilio_client = None
        
        try:
            from twilio.rest import Client
            
            account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
            auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
            
            if account_sid and auth_token:
                self.twilio_client = Client(account_sid, auth_token)
                self.twilio_from_number = os.environ.get('TWILIO_PHONE_NUMBER', '+14155238886')
                self.twilio_enabled = True
                logger.info("✅ Twilio SMS service initialized (fallback)")
            else:
                logger.warning("⚠️ Twilio credentials not configured")
        except ImportError:
            logger.warning("⚠️ Twilio SDK not installed. Run: pip install twilio")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Twilio: {str(e)}")
        
        # WhatsApp Business API (future enhancement)
        self.whatsapp_enabled = False
        self.whatsapp_token = os.environ.get('WHATSAPP_ACCESS_TOKEN')
        if self.whatsapp_token:
            self.whatsapp_phone_id = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '676188225586230')
            self.whatsapp_enabled = True
            logger.info("✅ WhatsApp Business API configured")
    
    def is_african_number(self, phone_number: str) -> bool:
        """Check if phone number is from an African country."""
        for code in AFRICAN_COUNTRY_CODES:
            if phone_number.startswith(code):
                return True
        return False
    
    def generate_otp_code(self) -> str:
        """Generate a 6-digit OTP code."""
        return str(random.randint(100000, 999999))
    
    def send_otp(self, phone_number: str, otp_code: str = None) -> Tuple[bool, str, Optional[str]]:
        """
        Send OTP to phone number using the best available service.
        
        Returns:
            Tuple of (success, message, message_id)
        """
        if not otp_code:
            otp_code = self.generate_otp_code()
        
        message = f"Your Dott verification code is: {otp_code}\n\nDo not share this code with anyone."
        
        # Determine best service based on phone number
        is_african = self.is_african_number(phone_number)
        
        # Try WhatsApp first if user has it (future enhancement)
        # if self.whatsapp_enabled and self._has_whatsapp(phone_number):
        #     return self._send_whatsapp_otp(phone_number, otp_code)
        
        # For African numbers, try Africa's Talking first
        if is_african and self.africas_talking_enabled:
            success, msg, msg_id = self._send_africas_talking_sms(phone_number, message)
            if success:
                return success, msg, msg_id
            logger.warning(f"Africa's Talking failed, trying Twilio: {msg}")
        
        # Try Twilio as fallback or for non-African numbers
        if self.twilio_enabled:
            return self._send_twilio_sms(phone_number, message)
        
        # If no service is available, return mock success in development
        if os.environ.get('DJANGO_ENV') == 'development':
            logger.warning(f"📱 DEVELOPMENT MODE: Mock OTP {otp_code} for {phone_number}")
            return True, f"Development mode: OTP is {otp_code}", f"dev_{otp_code}"
        
        return False, "No SMS service available", None
    
    def _send_africas_talking_sms(self, phone_number: str, message: str) -> Tuple[bool, str, Optional[str]]:
        """Send SMS using Africa's Talking."""
        try:
            # Africa's Talking format
            response = self.africas_talking_sms.send(
                message,
                [phone_number],
                # sender_id='DOTT'  # Optional: Short code or alphanumeric sender ID
            )
            
            # Check response
            if response['SMSMessageData']['Recipients']:
                recipient = response['SMSMessageData']['Recipients'][0]
                if recipient['status'] == 'Success':
                    logger.info(f"✅ Africa's Talking SMS sent to {phone_number}")
                    return True, "SMS sent successfully", recipient['messageId']
                else:
                    return False, f"SMS failed: {recipient['status']}", None
            
            return False, "No recipients in response", None
            
        except Exception as e:
            logger.error(f"❌ Africa's Talking error: {str(e)}")
            return False, str(e), None
    
    def _send_twilio_sms(self, phone_number: str, message: str) -> Tuple[bool, str, Optional[str]]:
        """Send SMS using Twilio."""
        try:
            message = self.twilio_client.messages.create(
                body=message,
                from_=self.twilio_from_number,
                to=phone_number
            )
            
            logger.info(f"✅ Twilio SMS sent to {phone_number}: {message.sid}")
            return True, "SMS sent successfully", message.sid
            
        except Exception as e:
            logger.error(f"❌ Twilio error: {str(e)}")
            return False, str(e), None
    
    def _send_whatsapp_otp(self, phone_number: str, otp_code: str) -> Tuple[bool, str, Optional[str]]:
        """
        Send OTP via WhatsApp Business API (future enhancement).
        This is much cheaper than SMS and works well in Africa.
        """
        try:
            import requests
            
            # WhatsApp API endpoint
            url = f"https://graph.facebook.com/v17.0/{self.whatsapp_phone_id}/messages"
            
            # Format phone number (remove + sign)
            formatted_number = phone_number.lstrip('+')
            
            # Create template message
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_number,
                "type": "template",
                "template": {
                    "name": "otp_verification",  # You need to create this template in Meta Business
                    "language": {
                        "code": "en"
                    },
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {
                                    "type": "text",
                                    "text": otp_code
                                }
                            ]
                        }
                    ]
                }
            }
            
            headers = {
                "Authorization": f"Bearer {self.whatsapp_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ WhatsApp OTP sent to {phone_number}")
                return True, "WhatsApp message sent", data.get('messages', [{}])[0].get('id')
            else:
                logger.error(f"WhatsApp API error: {response.text}")
                return False, f"WhatsApp failed: {response.status_code}", None
                
        except Exception as e:
            logger.error(f"❌ WhatsApp error: {str(e)}")
            return False, str(e), None
    
    def get_sms_cost_estimate(self, phone_number: str) -> dict:
        """
        Get estimated cost for sending SMS to a number.
        Helps choose the most cost-effective method.
        """
        is_african = self.is_african_number(phone_number)
        
        costs = {
            'currency': 'USD',
            'estimates': []
        }
        
        if is_african:
            costs['estimates'].append({
                'service': "Africa's Talking",
                'cost': 0.002,  # ~$0.002 per SMS in most African countries
                'preferred': True
            })
        
        costs['estimates'].append({
            'service': 'Twilio',
            'cost': 0.0075 if not is_african else 0.045,  # Higher for African destinations
            'preferred': not is_african
        })
        
        if self.whatsapp_enabled:
            costs['estimates'].append({
                'service': 'WhatsApp',
                'cost': 0.0001,  # WhatsApp is much cheaper
                'preferred': False,  # Requires user to have WhatsApp
                'note': 'Requires WhatsApp installed'
            })
        
        return costs


# Initialize the smart SMS service
smart_sms_service = SmartSMSService()


# Example usage and testing
if __name__ == "__main__":
    # Test with different numbers
    test_numbers = [
        '+254712345678',  # Kenya (Africa's Talking preferred)
        '+211912345678',  # South Sudan (Africa's Talking preferred)
        '+14155552671',   # USA (Twilio preferred)
    ]
    
    for number in test_numbers:
        print(f"\n📱 Testing {number}:")
        print(f"  Is African: {smart_sms_service.is_african_number(number)}")
        print(f"  Cost estimate: {smart_sms_service.get_sms_cost_estimate(number)}")
        
        # Uncomment to actually send
        # success, message, msg_id = smart_sms_service.send_otp(number)
        # print(f"  Result: {success} - {message}")