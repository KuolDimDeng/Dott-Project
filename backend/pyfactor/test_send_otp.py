#!/usr/bin/env python
"""
Test sending OTP to a real phone number.
Run in Render shell: python test_send_otp.py +1234567890
"""
import os
import sys
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

if len(sys.argv) < 2:
    print("Usage: python test_send_otp.py +1234567890")
    print("Note: Use YOUR phone number, not the Twilio number (+15513488487)")
    sys.exit(1)

phone_number = sys.argv[1]

# Validate it's not the Twilio number
if phone_number == "+15513488487":
    print("❌ Error: That's the Twilio sender number!")
    print("   Please use your actual phone number to receive the SMS")
    sys.exit(1)

print(f"📱 Testing OTP send to: {phone_number}")

from django.test import RequestFactory
from custom_auth.phone_auth_views import send_otp
import json

factory = RequestFactory()
request = factory.post('/api/auth/phone/send-otp/', 
                      data=json.dumps({'phone': phone_number}),
                      content_type='application/json')

response = send_otp(request)

if hasattr(response, 'content'):
    content = json.loads(response.content.decode('utf-8'))
    print(f"\n📊 Response status: {response.status_code}")
    print(f"📊 Response: {json.dumps(content, indent=2)}")
    
    if response.status_code == 200 and content.get('success'):
        print(f"\n✅ SUCCESS! Check {phone_number} for the OTP code")
        print(f"   The code expires in {content.get('expires_in', 600)} seconds")
    else:
        print(f"\n❌ Failed: {content.get('message')}")
else:
    print(f"❌ Unexpected response: {response}")