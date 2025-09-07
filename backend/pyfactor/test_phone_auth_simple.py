#!/usr/bin/env python
"""
Simple test script to identify phone auth errors on staging.
Run this in Render shell: python test_phone_auth_simple.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

print("Testing phone auth...")

# Test 1: Import models
try:
    from custom_auth.phone_otp_models import PhoneOTP, PhoneVerificationAttempt
    print("✅ Models imported")
except Exception as e:
    print(f"❌ Model import failed: {e}")
    sys.exit(1)

# Test 2: Import views
try:
    from custom_auth.phone_auth_views import send_otp, verify_otp
    print("✅ Views imported")
except Exception as e:
    print(f"❌ View import failed: {e}")
    sys.exit(1)

# Test 3: Check Twilio config
try:
    from django.conf import settings
    sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
    auth = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
    phone = getattr(settings, 'TWILIO_PHONE_NUMBER', None)
    
    if sid and auth and phone:
        print(f"✅ Twilio configured: {sid[:10]}..., {phone}")
    else:
        print("❌ Twilio not configured")
        sys.exit(1)
except Exception as e:
    print(f"❌ Config error: {e}")
    sys.exit(1)

# Test 4: Simulate send_otp request
try:
    from django.test import RequestFactory
    from django.http import JsonResponse
    import json
    
    factory = RequestFactory()
    request = factory.post('/api/auth/phone/send-otp/', 
                          data=json.dumps({'phone': '+15513488487'}),
                          content_type='application/json')
    
    print("\n📱 Testing send_otp with +15513488487...")
    response = send_otp(request)
    
    if isinstance(response, JsonResponse):
        # Parse the response
        import json
        content = json.loads(response.content.decode('utf-8'))
        print(f"Response status: {response.status_code}")
        print(f"Response: {content}")
        
        if response.status_code == 200 and content.get('success'):
            print("✅ send_otp works!")
        else:
            print(f"❌ send_otp failed: {content.get('message')}")
    else:
        print(f"❌ Unexpected response type: {type(response)}")
        
except Exception as e:
    print(f"❌ send_otp error: {e}")
    import traceback
    traceback.print_exc()

print("\nDone!")