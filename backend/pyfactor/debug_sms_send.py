#!/usr/bin/env python
"""
Debug why SMS is not actually being sent through Twilio.
Run in Render shell: python debug_sms_send.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

print("=" * 60)
print("🔍 Debugging SMS Sending")
print("=" * 60)

# 1. Check if Twilio is installed
print("\n1️⃣ Checking Twilio package:")
try:
    import twilio
    print(f"✅ Twilio installed: version {twilio.__version__}")
    from twilio.rest import Client
    print("✅ Can import Twilio Client")
except ImportError as e:
    print(f"❌ Twilio not installed: {e}")
    print("\n⚠️  Run: pip install twilio")
    sys.exit(1)

# 2. Check SMS service
print("\n2️⃣ Checking SMS service:")
try:
    from custom_auth.sms_service import send_sms_via_twilio, send_sms
    print("✅ SMS service imported")
except ImportError as e:
    print(f"❌ SMS service import error: {e}")
    sys.exit(1)

# 3. Check Twilio credentials
print("\n3️⃣ Checking Twilio credentials:")
from django.conf import settings
account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
phone_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)

if not all([account_sid, auth_token, phone_number]):
    print("❌ Missing Twilio credentials")
    print(f"   TWILIO_ACCOUNT_SID: {'✅' if account_sid else '❌'}")
    print(f"   TWILIO_AUTH_TOKEN: {'✅' if auth_token else '❌'}")
    print(f"   TWILIO_PHONE_NUMBER: {'✅' if phone_number else '❌'}")
else:
    print(f"✅ All credentials present")
    print(f"   Account SID: {account_sid[:10]}...")
    print(f"   Phone: {phone_number}")

# 4. Test sending SMS directly
print("\n4️⃣ Testing direct SMS send to +13855007716:")
try:
    from twilio.rest import Client
    client = Client(account_sid, auth_token)
    
    test_message = "Test from Dott: Your verification code is 123456"
    
    print(f"   Sending from: {phone_number}")
    print(f"   Sending to: +13855007716")
    print(f"   Message: {test_message}")
    
    message = client.messages.create(
        body=test_message,
        from_=phone_number,
        to="+13855007716"
    )
    
    print(f"\n✅ SMS sent successfully!")
    print(f"   Message SID: {message.sid}")
    print(f"   Status: {message.status}")
    print(f"   Price: {message.price}")
    
    # Check status
    import time
    time.sleep(2)
    message = client.messages(message.sid).fetch()
    print(f"   Updated status: {message.status}")
    if message.error_code:
        print(f"   Error: {message.error_code} - {message.error_message}")
        
except Exception as e:
    print(f"❌ Failed to send SMS: {e}")
    import traceback
    traceback.print_exc()

# 5. Test the actual send_sms function
print("\n5️⃣ Testing send_sms function:")
try:
    from custom_auth.sms_service import send_sms
    result = send_sms("+13855007716", "Test from send_sms: Code 654321")
    print(f"   Result: {result}")
    if result.get('success'):
        print(f"✅ send_sms function works!")
        print(f"   Message SID: {result.get('message_sid')}")
    else:
        print(f"❌ send_sms failed: {result.get('error')}")
except Exception as e:
    print(f"❌ Error calling send_sms: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)