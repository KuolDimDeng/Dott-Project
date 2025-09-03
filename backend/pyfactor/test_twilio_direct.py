#!/usr/bin/env python
"""
Direct Twilio SMS Test
Tests if Twilio can send SMS with current credentials
"""

import os
from twilio.rest import Client

# Set credentials directly for testing
ACCOUNT_SID = 'AC97f6812cb1147e6d4cdf95bc2a76bb48'
AUTH_TOKEN = 'b5d442d0dcde2adf0856ca051e01091c'
FROM_NUMBER = '+15513488487'  # Your new local number
TO_NUMBER = '+13855007716'    # Your phone number

def test_twilio_sms():
    """Test sending SMS directly through Twilio"""
    try:
        # Initialize Twilio client
        client = Client(ACCOUNT_SID, AUTH_TOKEN)
        
        print(f"Sending SMS from {FROM_NUMBER} to {TO_NUMBER}")
        
        # Send SMS
        message = client.messages.create(
            body="Test from Dott: Your verification code is 123456",
            from_=FROM_NUMBER,
            to=TO_NUMBER
        )
        
        print(f"✅ SMS sent successfully!")
        print(f"Message SID: {message.sid}")
        print(f"Status: {message.status}")
        print(f"Date sent: {message.date_sent}")
        
    except Exception as e:
        print(f"❌ Error sending SMS: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_twilio_sms()