"""
SMS Service for sending OTP codes via Twilio
Handles real SMS delivery for phone authentication
"""

import os
import logging
from typing import Tuple, Optional
from django.conf import settings
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)


class SMSService:
    """
    Service for sending SMS messages via Twilio.
    Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in settings.
    """
    
    def __init__(self):
        # Get Twilio credentials from environment variables
        self.account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', os.environ.get('TWILIO_ACCOUNT_SID'))
        self.auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', os.environ.get('TWILIO_AUTH_TOKEN'))
        self.from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', os.environ.get('TWILIO_PHONE_NUMBER'))
        
        # Initialize Twilio client if credentials are available
        self.client = None
        if self.account_sid and self.auth_token:
            try:
                self.client = Client(self.account_sid, self.auth_token)
                logger.info("✅ Twilio SMS service initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Twilio client: {str(e)}")
        else:
            logger.warning("⚠️ Twilio credentials not found. SMS sending will be simulated.")
    
    def send_otp(self, phone_number: str, otp_code: str) -> Tuple[bool, str, Optional[str]]:
        """
        Send OTP code via SMS.
        
        Args:
            phone_number: Phone number in E.164 format (e.g., +1234567890)
            otp_code: The OTP code to send
        
        Returns:
            Tuple of (success, status_message, message_sid)
        """
        # Format the message
        message_body = f"Your Dott verification code is: {otp_code}\n\nThis code will expire in 10 minutes."
        
        # If no Twilio client, simulate sending (for development)
        if not self.client:
            logger.warning(f"📱 SIMULATED SMS to {phone_number}: {message_body}")
            return True, "SMS simulated (no Twilio credentials)", None
        
        try:
            # Send real SMS via Twilio
            message = self.client.messages.create(
                body=message_body,
                from_=self.from_number,
                to=phone_number
            )
            
            logger.info(f"✅ SMS sent successfully to {phone_number}. SID: {message.sid}")
            return True, f"SMS sent via Twilio", message.sid
            
        except TwilioRestException as e:
            error_msg = self._parse_twilio_error(e)
            logger.error(f"❌ Twilio error sending SMS to {phone_number}: {error_msg}")
            return False, error_msg, None
            
        except Exception as e:
            logger.error(f"❌ Unexpected error sending SMS to {phone_number}: {str(e)}")
            return False, f"Failed to send SMS: {str(e)}", None
    
    def send_welcome_message(self, phone_number: str, user_name: str = "there") -> Tuple[bool, str, Optional[str]]:
        """
        Send welcome message after successful registration.
        """
        message_body = f"Welcome to Dott, {user_name}! 🎉\n\nYour account has been created successfully. You can now access all Dott features."
        
        if not self.client:
            logger.warning(f"📱 SIMULATED Welcome SMS to {phone_number}")
            return True, "Welcome SMS simulated", None
        
        try:
            message = self.client.messages.create(
                body=message_body,
                from_=self.from_number,
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
        if not self.client:
            logger.warning(f"📱 Cannot verify {phone_number} - no Twilio client")
            return True, "Verification skipped (no credentials)"
        
        try:
            phone_info = self.client.lookups.v1.phone_numbers(phone_number).fetch()
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
        if not self.client or not message_sid:
            return "unknown"
        
        try:
            message = self.client.messages(message_sid).fetch()
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