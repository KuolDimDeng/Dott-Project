#!/usr/bin/env python3
"""
Test SMS service configuration and send a test SMS.
This script checks if Twilio is properly configured and can send SMS.
"""

import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.sms_service_smart import SmartSMSService

def test_sms_service():
    """Test the SMS service configuration."""
    
    # Initialize the service
    service = SmartSMSService()
    
    print("🔍 Checking SMS Service Configuration...")
    print("-" * 50)
    
    # Check Twilio
    if service.twilio_enabled:
        print("✅ Twilio is configured")
        print(f"   - Account SID: {service.twilio_account_sid[:10]}...")
        print(f"   - From Number: {service.twilio_from_number}")
    else:
        print("❌ Twilio is NOT configured")
        print("   - Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN or TWILIO_PHONE_NUMBER")
    
    # Check Africa's Talking
    if service.africas_talking_enabled:
        print("✅ Africa's Talking is configured")
        print(f"   - Username: {service.africas_talking_username}")
    else:
        print("❌ Africa's Talking is NOT configured")
        print("   - Missing AFRICAS_TALKING_USERNAME or AFRICAS_TALKING_API_KEY")
    
    print("-" * 50)
    
    # Test sending SMS if requested
    if len(sys.argv) > 1:
        test_number = sys.argv[1]
        if not test_number.startswith('+'):
            print("❌ Phone number must be in international format (e.g., +1234567890)")
            return
        
        print(f"\n📱 Sending test SMS to {test_number}...")
        
        # Generate test OTP
        test_otp = "123456"
        
        # Send SMS
        success, message, sid = service.send_otp(test_number, test_otp)
        
        if success:
            print(f"✅ SMS sent successfully!")
            print(f"   - Message: {message}")
            print(f"   - SID: {sid}")
            print(f"   - OTP Code: {test_otp}")
        else:
            print(f"❌ Failed to send SMS")
            print(f"   - Error: {message}")
    else:
        print("\nTo send a test SMS, run:")
        print("python scripts/test_sms_service.py +1234567890")

if __name__ == "__main__":
    test_sms_service()
