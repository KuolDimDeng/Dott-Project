#!/usr/bin/env python
"""
Verify phone number with Twilio and check SMS capabilities.
Run in Render shell: python verify_phone_twilio.py +13855007716
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

if len(sys.argv) < 2:
    print("Usage: python verify_phone_twilio.py +13855007716")
    sys.exit(1)

phone_number = sys.argv[1]

print(f"🔍 Verifying phone number: {phone_number}")
print("=" * 60)

from django.conf import settings
from twilio.rest import Client

account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', os.environ.get('TWILIO_ACCOUNT_SID'))
auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', os.environ.get('TWILIO_AUTH_TOKEN'))

if not account_sid or not auth_token:
    print("❌ Missing Twilio credentials")
    sys.exit(1)

client = Client(account_sid, auth_token)

# 1. Verify the phone number exists and is valid
print("\n1️⃣ Checking if phone number is valid...")
try:
    phone_lookup = client.lookups.v2.phone_numbers(phone_number).fetch()
    print(f"✅ Valid phone number")
    print(f"   Country: {phone_lookup.country_code}")
    print(f"   National format: {phone_lookup.national_format}")
    print(f"   Valid: {phone_lookup.valid}")
except Exception as e:
    print(f"❌ Invalid phone number: {e}")
    sys.exit(1)

# 2. Check if it's a mobile number that can receive SMS
print("\n2️⃣ Checking SMS capability...")
try:
    phone_lookup = client.lookups.v2.phone_numbers(phone_number).fetch(
        fields='line_type_intelligence'
    )
    line_type = phone_lookup.line_type_intelligence.get('type', 'unknown')
    carrier = phone_lookup.line_type_intelligence.get('carrier_name', 'unknown')
    
    print(f"   Line type: {line_type}")
    print(f"   Carrier: {carrier}")
    
    if line_type in ['mobile', 'voip']:
        print(f"✅ Phone can receive SMS (type: {line_type})")
    else:
        print(f"⚠️  Phone type '{line_type}' may not receive SMS")
        
except Exception as e:
    print(f"⚠️  Could not check SMS capability: {e}")

# 3. Check Twilio account status
print("\n3️⃣ Checking Twilio account status...")
try:
    account = client.api.accounts(account_sid).fetch()
    print(f"   Account status: {account.status}")
    print(f"   Account type: {account.type}")
    
    if account.status != 'active':
        print(f"❌ Account is not active!")
    else:
        print(f"✅ Account is active")
        
except Exception as e:
    print(f"❌ Could not check account: {e}")

# 4. Check if number is verified (for trial accounts)
print("\n4️⃣ Checking if number needs verification...")
try:
    # For trial accounts, check verified numbers
    verified_numbers = client.outgoing_caller_ids.list(phone_number=phone_number)
    
    if verified_numbers:
        print(f"✅ Number is verified for this account")
    else:
        print(f"⚠️  Number may not be verified. Trial accounts require verification.")
        print(f"   To verify, go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified")
        
except Exception as e:
    print(f"⚠️  Could not check verification: {e}")

# 5. Try sending a test SMS
print("\n5️⃣ Attempting to send test SMS...")
try:
    message = client.messages.create(
        body=f"Twilio test message to verify delivery to {phone_number}",
        from_=getattr(settings, 'TWILIO_PHONE_NUMBER', os.environ.get('TWILIO_PHONE_NUMBER')),
        to=phone_number
    )
    
    print(f"✅ Message sent: {message.sid}")
    print(f"   Status: {message.status}")
    
    # Wait and check status
    import time
    time.sleep(3)
    
    message = client.messages(message.sid).fetch()
    print(f"   Updated status: {message.status}")
    
    if message.error_code:
        print(f"❌ Error {message.error_code}: {message.error_message}")
        print(f"\n📚 Error details:")
        print(f"   https://www.twilio.com/docs/api/errors/{message.error_code}")
    elif message.status == 'delivered':
        print(f"✅ SMS delivered successfully!")
    elif message.status == 'sent':
        print(f"✅ SMS sent, awaiting delivery confirmation")
    else:
        print(f"⚠️  SMS status: {message.status}")
        
except Exception as e:
    print(f"❌ Failed to send SMS: {e}")

print("\n" + "=" * 60)
print("📋 Summary:")
print("=" * 60)
print("\nIf SMS is not delivering, possible issues:")
print("1. Phone number is incorrect or inactive")
print("2. Carrier blocking (spam filters)")
print("3. Trial account needs number verification")
print("4. Geographic restrictions")
print("5. Number is landline, not mobile")
print("\nFor trial accounts, verify your number at:")
print("https://console.twilio.com/us1/develop/phone-numbers/manage/verified")