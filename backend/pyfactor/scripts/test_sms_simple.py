#!/usr/bin/env python3
"""
Simple SMS test - send actual SMS via Twilio
"""

import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def send_test_sms(phone_number):
    """Send a test SMS."""
    from custom_auth.sms_service_smart import SmartSMSService
    
    service = SmartSMSService()
    
    # Test OTP
    test_otp = "123456"
    message = f"Your Dott verification code is: {test_otp}\n\nThis code expires in 10 minutes."
    
    print(f"📱 Sending SMS to {phone_number}...")
    print(f"📝 Message: {message}")
    
    # Send directly via Twilio
    if service.twilio_enabled:
        try:
            result = service.twilio_client.messages.create(
                body=message,
                from_=service.twilio_from_number,
                to=phone_number
            )
            print(f"✅ SMS sent successfully!")
            print(f"   - SID: {result.sid}")
            print(f"   - Status: {result.status}")
            print(f"   - From: {result.from_}")
            print(f"   - To: {result.to}")
            return True
        except Exception as e:
            print(f"❌ Failed to send SMS: {e}")
            return False
    else:
        print("❌ Twilio is not configured!")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/test_sms_simple.py +13855007716")
        sys.exit(1)
    
    phone = sys.argv[1]
    if not phone.startswith('+'):
        print("Phone number must start with + and country code")
        sys.exit(1)
    
    send_test_sms(phone)
