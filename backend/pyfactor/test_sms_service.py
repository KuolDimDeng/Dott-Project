#!/usr/bin/env python
"""
Test SMS Service with Africa's Talking Sandbox
Run: python test_sms_service.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Set sandbox credentials
os.environ['AFRICAS_TALKING_API_KEY'] = 'atsk_363d2f60d839a914f917f8905cb51f9bb9df6449d2da68fe0be41e4fb783c46a4a0d7ad9'
os.environ['AFRICAS_TALKING_USERNAME'] = 'sandbox'
os.environ['SMS_SENDER_ID'] = 'AFRICASTKNG'

from custom_auth.sms_service import SMSService

def test_sms():
    """Test SMS sending with different phone numbers"""
    
    # Initialize service
    sms_service = SMSService()
    
    print("=" * 60)
    print("SMS SERVICE TEST - AFRICA'S TALKING SANDBOX")
    print("=" * 60)
    
    # Test cases
    test_numbers = [
        ('+254712345678', 'Kenya', 'Africa\'s Talking'),
        ('+2348012345678', 'Nigeria', 'Africa\'s Talking'),
        ('+256712345678', 'Uganda', 'Africa\'s Talking'),
        ('+27712345678', 'South Africa', 'Africa\'s Talking'),
        ('+1234567890', 'USA', 'Twilio'),
        ('+447123456789', 'UK', 'Twilio'),
    ]
    
    print("\n📱 Testing SMS routing logic:\n")
    
    for phone, country, expected_provider in test_numbers:
        is_african = sms_service._is_african_number(phone)
        provider = "Africa's Talking" if is_african else "Twilio"
        
        print(f"{phone:15} | {country:12} | Expected: {expected_provider:15} | Detected: {provider:15} | ✅" if provider == expected_provider else "❌")
    
    print("\n" + "=" * 60)
    print("📤 Sending test SMS to African number...")
    print("=" * 60)
    
    # Test actual SMS sending (sandbox - simulated)
    test_phone = '+254712345678'  # Kenya number
    test_otp = '123456'
    
    print(f"\nPhone: {test_phone}")
    print(f"OTP Code: {test_otp}")
    print(f"Provider: Africa's Talking (Sandbox Mode)")
    
    success, message, message_id = sms_service.send_otp(test_phone, test_otp)
    
    print(f"\n📊 Result:")
    print(f"Success: {'✅' if success else '❌'}")
    print(f"Message: {message}")
    print(f"Message ID: {message_id if message_id else 'N/A'}")
    
    if success:
        print("\n✅ SMS service is working correctly!")
        print("📝 Note: In sandbox mode, SMS are simulated and not actually delivered.")
        print("📊 Check delivery reports at:")
        print("   https://account.africastalking.com/apps/sandbox/sms/outbox")
    else:
        print("\n❌ SMS service test failed. Check your configuration.")
    
    print("\n" + "=" * 60)
    print("💡 Next Steps:")
    print("=" * 60)
    print("1. Add these to your .env file:")
    print("   AFRICAS_TALKING_API_KEY=atsk_363d2f60d839a914f917f8905cb51f9bb9df6449d2da68fe0be41e4fb783c46a4a0d7ad9")
    print("   AFRICAS_TALKING_USERNAME=sandbox")
    print("   SMS_SENDER_ID=AFRICASTKNG")
    print("\n2. For production:")
    print("   - Create a live app at: https://account.africastalking.com/")
    print("   - Add credit (minimum $10)")
    print("   - Update USERNAME to your live username")
    print("   - Update API_KEY to your live key")

if __name__ == '__main__':
    test_sms()