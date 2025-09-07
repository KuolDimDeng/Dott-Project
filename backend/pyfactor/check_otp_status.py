#!/usr/bin/env python
"""
Check the status of recent OTP attempts and Twilio message status.
Run in Render shell: python check_otp_status.py
"""
import os
import sys
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.utils import timezone
from custom_auth.phone_otp_models import PhoneOTP, PhoneVerificationAttempt

print("=" * 60)
print("📱 Checking Recent OTP Activity")
print("=" * 60)

# Check recent OTPs
print("\n🔍 Recent OTP records (last 30 minutes):")
recent_otps = PhoneOTP.objects.filter(
    created_at__gte=timezone.now() - timedelta(minutes=30)
).order_by('-created_at')[:5]

for otp in recent_otps:
    print(f"""
📱 Phone: {otp.phone_number}
   Code: {otp.otp_code}
   Created: {otp.created_at}
   Expires: {otp.expires_at}
   Used: {otp.used}
   Delivery Status: {otp.delivery_status}
   Message SID: {otp.message_sid or 'None'}
   """)

# Check if Twilio is actually being called
print("\n🔍 Checking Twilio configuration:")
from django.conf import settings

account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
phone_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)

print(f"Account SID: {account_sid[:10]}..." if account_sid else "❌ No Account SID")
print(f"Auth Token: {'***' if auth_token else '❌ No Auth Token'}")
print(f"From Number: {phone_number if phone_number else '❌ No Phone Number'}")

# Try to check Twilio message status if we have a message_sid
if recent_otps and account_sid and auth_token:
    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        
        print("\n🔍 Checking Twilio message status:")
        for otp in recent_otps[:3]:  # Check last 3
            if otp.message_sid:
                try:
                    message = client.messages(otp.message_sid).fetch()
                    print(f"""
📱 Message to {otp.phone_number}:
   SID: {message.sid}
   Status: {message.status}
   Error Code: {message.error_code}
   Error Message: {message.error_message}
   Date Sent: {message.date_sent}
   Price: {message.price} {message.price_unit if message.price else ''}
                    """)
                except Exception as e:
                    print(f"   ❌ Could not fetch status for {otp.message_sid}: {e}")
            else:
                print(f"   ⚠️  No message_sid for OTP to {otp.phone_number}")
    except ImportError:
        print("❌ Twilio package not available")
    except Exception as e:
        print(f"❌ Error checking Twilio: {e}")

# Check verification attempts
print("\n🔍 Recent verification attempts (last 30 minutes):")
attempts = PhoneVerificationAttempt.objects.filter(
    created_at__gte=timezone.now() - timedelta(minutes=30)
).order_by('-created_at')[:5]

for attempt in attempts:
    print(f"""
📱 Phone: {attempt.phone_number}
   Type: {attempt.attempt_type}
   Success: {attempt.success}
   Error: {attempt.error_message or 'None'}
   Time: {attempt.created_at}
   """)

print("\n" + "=" * 60)