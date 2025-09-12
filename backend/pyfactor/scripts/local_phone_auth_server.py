#!/usr/bin/env python3
"""
Local phone auth server for testing SMS functionality
Runs on port 8001 and sends actual SMS via Twilio
"""

import os
import sys
import json
import random
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
import django
django.setup()

from custom_auth.phone_otp_models import PhoneOTP
from custom_auth.sms_service_smart import SmartSMSService

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Store OTPs in memory for testing
otp_store = {}

@app.route('/api/auth/phone/send-otp/', methods=['POST'])
def send_otp():
    """Send OTP via SMS"""
    data = request.json
    phone = data.get('phone')
    
    if not phone:
        return jsonify({
            'success': False,
            'message': 'Phone number is required'
        }), 400
    
    # Generate OTP
    otp_code = str(random.randint(100000, 999999))
    
    # Store OTP
    otp_store[phone] = {
        'code': otp_code,
        'expires': datetime.now() + timedelta(minutes=10)
    }
    
    # Send SMS
    service = SmartSMSService()
    message = f"Your Dott verification code is: {otp_code}\n\nThis code expires in 10 minutes."
    
    print(f"📱 Sending OTP {otp_code} to {phone}")
    
    if service.twilio_enabled:
        try:
            result = service.twilio_client.messages.create(
                body=message,
                from_=service.twilio_from_number,
                to=phone
            )
            print(f"✅ SMS sent: {result.sid}")
            
            return jsonify({
                'success': True,
                'message': 'Verification code sent successfully',
                'expires_in': 600,
                'debug_otp': otp_code  # Remove in production
            })
        except Exception as e:
            print(f"❌ SMS failed: {e}")
            # Still return success with debug OTP for testing
            return jsonify({
                'success': True,
                'message': 'SMS failed but OTP generated (dev mode)',
                'expires_in': 600,
                'debug_otp': otp_code
            })
    else:
        # Development mode - return OTP in response
        return jsonify({
            'success': True,
            'message': 'Development mode - SMS not sent',
            'expires_in': 600,
            'debug_otp': otp_code
        })

@app.route('/api/auth/phone/verify-otp/', methods=['POST'])
def verify_otp():
    """Verify OTP"""
    data = request.json
    phone = data.get('phone')
    otp = data.get('otp')
    
    if not phone or not otp:
        return jsonify({
            'success': False,
            'message': 'Phone and OTP are required'
        }), 400
    
    stored = otp_store.get(phone)
    if not stored:
        return jsonify({
            'success': False,
            'message': 'No OTP found for this number'
        }), 400
    
    if stored['expires'] < datetime.now():
        return jsonify({
            'success': False,
            'message': 'OTP has expired'
        }), 400
    
    if stored['code'] != otp:
        return jsonify({
            'success': False,
            'message': 'Invalid OTP'
        }), 400
    
    # OTP is valid
    del otp_store[phone]  # Remove used OTP
    
    return jsonify({
        'success': True,
        'message': 'Phone verified successfully',
        'verified': True
    })

if __name__ == '__main__':
    print("🚀 Local Phone Auth Server")
    print("📱 Running on http://localhost:8001")
    print("✅ Twilio SMS will be sent if configured")
    print("-" * 50)
    app.run(host='0.0.0.0', port=8001, debug=True)
