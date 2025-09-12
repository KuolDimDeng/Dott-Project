"""
SMS Service for sending OTP codes via Twilio or Africa's Talking
Handles real SMS delivery for phone authentication
Automatically selects best provider based on phone number region
"""

import os
import logging
import requests
import json
from typing import Tuple, Optional, Dict, Any
from django.conf import settings
from .sms_service_smart import smart_sms_service

# Conditional Twilio import - handle gracefully if not installed
try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioRestException
    TWILIO_AVAILABLE = True
except ImportError:
    Client = None
    TwilioRestException = Exception
    TWILIO_AVAILABLE = False
    logging.warning("Twilio package not available. SMS functionality will be limited.")

logger = logging.getLogger(__name__)


class SMSService:
    """
    Service for sending SMS messages via Twilio or Africa's Talking.
    Automatically selects the best provider based on phone number region.
    Africa's Talking is preferred for African numbers (+254, +256, +255, +234, etc.)
    Twilio is used for all other regions.
    """
    
    # African country codes where Africa's Talking is preferred
    AFRICAN_COUNTRY_CODES = [
        '+254',  # Kenya
        '+256',  # Uganda
        '+255',  # Tanzania
        '+234',  # Nigeria
        '+233',  # Ghana
        '+250',  # Rwanda
        '+251',  # Ethiopia
        '+27',   # South Africa
        '+263',  # Zimbabwe
        '+265',  # Malawi
        '+260',  # Zambia
        '+237',  # Cameroon
        '+225',  # Côte d'Ivoire
        '+221',  # Senegal
        '+243',  # DRC
        '+244',  # Angola
    ]
    
    def __init__(self):
        # Get Twilio credentials from environment variables
        self.twilio_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', os.environ.get('TWILIO_ACCOUNT_SID'))
        self.twilio_token = getattr(settings, 'TWILIO_AUTH_TOKEN', os.environ.get('TWILIO_AUTH_TOKEN'))
        self.twilio_number = getattr(settings, 'TWILIO_PHONE_NUMBER', os.environ.get('TWILIO_PHONE_NUMBER'))
        
        # Get Africa's Talking credentials
        self.at_api_key = getattr(settings, 'AFRICAS_TALKING_API_KEY', os.environ.get('AFRICAS_TALKING_API_KEY'))
        self.at_username = getattr(settings, 'AFRICAS_TALKING_USERNAME', os.environ.get('AFRICAS_TALKING_USERNAME', 'sandbox'))
        self.at_sender_id = getattr(settings, 'SMS_SENDER_ID', os.environ.get('SMS_SENDER_ID', 'DOTT'))
        
        # Initialize Twilio client if credentials and package are available
        self.twilio_client = None
        if TWILIO_AVAILABLE and self.twilio_sid and self.twilio_token and Client:
            try:
                self.twilio_client = Client(self.twilio_sid, self.twilio_token)
                logger.info("✅ Twilio SMS service initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Twilio: {str(e)}")
        elif not TWILIO_AVAILABLE:
            logger.warning("⚠️ Twilio package not available. Install 'twilio' package for full SMS support.")
        
        # Check Africa's Talking availability
        self.at_available = bool(self.at_api_key)
        if self.at_available:
            logger.info("✅ Africa's Talking SMS service available")
        
        # Log warning if neither service is available
        if not self.twilio_client and not self.at_available:
            logger.warning("⚠️ No SMS service configured. SMS sending will be simulated.")
    
    def _is_african_number(self, phone_number: str) -> bool:
        """Check if phone number is from an African country"""
        return any(phone_number.startswith(code) for code in self.AFRICAN_COUNTRY_CODES)
    
    def send_otp(self, phone_number: str, otp_code: str) -> Tuple[bool, str, Optional[str]]:
        """
        Send OTP code via SMS using SmartSMSService for intelligent routing:
        - African numbers: Africa's Talking (primary) -> Twilio (fallback)
        - Other numbers: Twilio only
        - Future: WhatsApp Business API support
        
        Args:
            phone_number: Phone number in E.164 format (e.g., +1234567890)
            otp_code: The OTP code to send
        
        Returns:
            Tuple of (success, status_message, message_sid)
        """
        # Use the smart SMS service which has enhanced African country detection
        # and WhatsApp support preparation
        return smart_sms_service.send_otp(phone_number, otp_code)
    
    def _send_via_africas_talking(self, phone_number: str, message: str) -> Tuple[bool, str, Optional[str]]:
        """Send SMS via Africa's Talking API"""
        headers = {
            'apiKey': self.at_api_key,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        }
        
        data = {
            'username': self.at_username,
            'to': phone_number,
            'message': message,
            'from': self.at_sender_id
        }
        
        try:
            response = requests.post(
                'https://api.africastalking.com/version1/messaging',
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
                
                if status_code == 101:  # Success
                    message_id = recipient.get('messageId')
                    logger.info(f"✅ SMS sent via Africa's Talking to {phone_number}. ID: {message_id}")
                    return True, "SMS sent via Africa's Talking", message_id
                else:
                    return False, f"Africa's Talking error code: {status_code}", None
            else:
                return False, "No recipients in Africa's Talking response", None
                
        except Exception as e:
            logger.error(f"❌ Africa's Talking error: {str(e)}")
            return False, f"Africa's Talking error: {str(e)}", None
    
    def _send_via_twilio(self, phone_number: str, message: str) -> Tuple[bool, str, Optional[str]]:
        """Send SMS via Twilio"""
        if not TWILIO_AVAILABLE or not self.twilio_client:
            logger.warning("❌ Twilio not available - cannot send SMS")
            return False, "Twilio service not available", None
            
        try:
            msg = self.twilio_client.messages.create(
                body=message,
                from_=self.twilio_number,
                to=phone_number
            )
            
            logger.info(f"✅ SMS sent via Twilio to {phone_number}. SID: {msg.sid}")
            return True, "SMS sent via Twilio", msg.sid
            
        except TwilioRestException as e:
            error_msg = self._parse_twilio_error(e)
            logger.error(f"❌ Twilio error: {error_msg}")
            return False, error_msg, None
            
        except Exception as e:
            logger.error(f"❌ Twilio unexpected error: {str(e)}")
            return False, f"Twilio error: {str(e)}", None
    
    def send_welcome_message(self, phone_number: str, user_name: str = "there") -> Tuple[bool, str, Optional[str]]:
        """
        Send welcome message after successful registration.
        """
        message_body = f"Welcome to Dott, {user_name}! 🎉\n\nYour account has been created successfully. You can now access all Dott features."
        
        if not TWILIO_AVAILABLE or not self.twilio_client:
            logger.warning(f"📱 SIMULATED Welcome SMS to {phone_number}")
            return True, "Welcome SMS simulated", None
        
        try:
            message = self.twilio_client.messages.create(
                body=message_body,
                from_=self.twilio_number,
                to=phone_number
            )
            logger.info(f"✅ Welcome SMS sent to {phone_number}")
            return True, "Welcome SMS sent", message.sid
            
        except Exception as e:
            logger.error(f"❌ Failed to send welcome SMS: {str(e)}")
            return False, str(e), None
    
    def verify_phone_number(self, phone_number: str) -> Tuple[bool, str]:
        """
        Verify if a phone number is valid and can receive SMS.
        Uses Twilio Lookup API.
        """
        if not TWILIO_AVAILABLE or not self.twilio_client:
            logger.warning(f"📱 Cannot verify {phone_number} - no Twilio client")
            return True, "Verification skipped (no credentials)"
        
        try:
            phone_info = self.twilio_client.lookups.v1.phone_numbers(phone_number).fetch()
            logger.info(f"✅ Phone number {phone_number} is valid. Country: {phone_info.country_code}")
            return True, f"Valid phone number from {phone_info.country_code}"
            
        except TwilioRestException as e:
            if e.code == 20404:
                return False, "Invalid phone number"
            return False, f"Could not verify phone number: {str(e)}"
            
        except Exception as e:
            logger.error(f"❌ Error verifying phone number: {str(e)}")
            return False, f"Verification failed: {str(e)}"
    
    def _parse_twilio_error(self, error: TwilioRestException) -> str:
        """
        Parse Twilio error and return user-friendly message.
        """
        error_messages = {
            21211: "Invalid phone number format. Please use format: +1234567890",
            21214: "Phone number cannot receive SMS",
            21401: "Invalid Twilio credentials",
            21408: "Cannot send SMS to this region",
            21610: "Phone number is on the unsubscribed list",
            21614: "Phone number is not mobile-enabled",
        }
        
        return error_messages.get(error.code, f"SMS error: {error.msg}")
    
    def check_delivery_status(self, message_sid: str) -> str:
        """
        Check the delivery status of a sent message.
        """
        if not TWILIO_AVAILABLE or not self.twilio_client or not message_sid:
            return "unknown"
        
        try:
            message = self.twilio_client.messages(message_sid).fetch()
            return message.status  # queued, sending, sent, delivered, failed, undelivered
        except Exception as e:
            logger.error(f"❌ Error checking message status: {str(e)}")
            return "unknown"


# Global SMS service instance
sms_service = SMSService()


def send_otp_sms(phone_number: str, otp_code: str) -> Tuple[bool, str, Optional[str]]:
    """
    Convenience function to send OTP SMS.
    """
    return sms_service.send_otp(phone_number, otp_code)


def verify_phone_format(phone_number: str) -> Tuple[bool, str]:
    """
    Convenience function to verify phone number format.
    """
    return sms_service.verify_phone_number(phone_number)