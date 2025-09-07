#!/usr/bin/env python
"""
Check the actual delivery status of a Twilio message.
Run in Render shell: python check_message_status.py SM20ab138fed03fb49fc12c05fbbf313f4
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings
from twilio.rest import Client

# Get the message SID from command line or use the recent one
if len(sys.argv) > 1:
    message_sid = sys.argv[1]
else:
    # Use the most recent message SID from your test
    message_sid = "SM20ab138fed03fb49fc12c05fbbf313f4"

print(f"🔍 Checking status of message: {message_sid}")
print("=" * 60)

account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', os.environ.get('TWILIO_ACCOUNT_SID'))
auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', os.environ.get('TWILIO_AUTH_TOKEN'))

if not account_sid or not auth_token:
    print("❌ Missing Twilio credentials")
    sys.exit(1)

try:
    client = Client(account_sid, auth_token)
    
    # Fetch the message details
    message = client.messages(message_sid).fetch()
    
    print(f"📱 To: {message.to}")
    print(f"📤 From: {message.from_}")
    print(f"📝 Body: {message.body[:50]}...")
    print(f"📅 Date Created: {message.date_created}")
    print(f"📅 Date Sent: {message.date_sent}")
    print(f"📅 Date Updated: {message.date_updated}")
    print(f"\n📊 Status: {message.status}")
    print(f"💵 Price: {message.price} {message.price_unit if message.price else ''}")
    print(f"🔢 Segments: {message.num_segments}")
    
    if message.error_code:
        print(f"\n❌ ERROR CODE: {message.error_code}")
        print(f"❌ ERROR MESSAGE: {message.error_message}")
        print(f"\n📚 Learn more about error {message.error_code}:")
        print(f"   https://www.twilio.com/docs/api/errors/{message.error_code}")
    
    # Provide status explanation
    print("\n📋 Status Explanation:")
    status_explanations = {
        'queued': '⏳ Message is queued for delivery',
        'sending': '📤 Message is being sent',
        'sent': '✅ Message was sent to carrier',
        'delivered': '✅ Message was delivered to phone',
        'undelivered': '❌ Message could not be delivered',
        'failed': '❌ Message failed to send',
        'read': '✅ Message was read (WhatsApp only)',
        'received': '📥 Inbound message received'
    }
    
    explanation = status_explanations.get(message.status, 'Unknown status')
    print(f"   {explanation}")
    
    if message.status == 'undelivered':
        print("\n⚠️  Common reasons for undelivered:")
        print("   1. A2P 10DLC registration required for US numbers")
        print("   2. Carrier filtering (spam prevention)")
        print("   3. Phone number is unreachable or invalid")
        print("   4. Number is on do-not-disturb or blocked list")
        
except Exception as e:
    print(f"❌ Error fetching message: {e}")

print("\n" + "=" * 60)

# Also check recent messages to this number
print("\n📜 Recent messages to +13855007716:")
try:
    messages = client.messages.list(to="+13855007716", limit=5)
    
    for msg in messages:
        print(f"\n   SID: {msg.sid}")
        print(f"   Status: {msg.status}")
        print(f"   Date: {msg.date_created}")
        print(f"   Error: {msg.error_code if msg.error_code else 'None'}")
        
except Exception as e:
    print(f"❌ Could not fetch message history: {e}")

print("\n💡 Next Steps:")
print("1. If status is 'undelivered' with error 30034:")
print("   - Complete A2P 10DLC registration")
print("   - Or buy a toll-free number")
print("2. If status is 'sent' but not 'delivered':")
print("   - Check if your phone has SMS blocking")
print("   - Try with a different phone number")