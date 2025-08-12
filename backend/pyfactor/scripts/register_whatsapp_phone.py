#!/usr/bin/env python3
"""
Script to register WhatsApp Business phone number with Cloud API
Run this after receiving the PIN via SMS to your WhatsApp Business number
"""

import os
import requests
import json

def register_whatsapp_phone(pin_code=None):
    """Register WhatsApp Business phone number"""
    
    access_token = os.environ.get('WHATSAPP_ACCESS_TOKEN')
    phone_number_id = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '676188225586230')
    
    if not access_token:
        print("❌ WHATSAPP_ACCESS_TOKEN environment variable not set")
        return False
        
    print(f"🔧 Registering WhatsApp phone number: {phone_number_id}")
    print(f"🔑 Access token: {access_token[:20]}...")
    
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/register"
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'messaging_product': 'whatsapp'
    }
    
    # Add PIN if provided
    if pin_code:
        data['pin'] = pin_code
        print(f"📱 Using PIN: {pin_code}")
    
    try:
        print("📤 Sending registration request...")
        response = requests.post(url, json=data, headers=headers)
        
        print(f"📥 Response status: {response.status_code}")
        print(f"📋 Response body: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ WhatsApp phone number registered successfully!")
            print(f"📞 Response: {json.dumps(result, indent=2)}")
            return True
        else:
            print(f"❌ Registration failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error during registration: {str(e)}")
        return False

def request_pin():
    """Request PIN to be sent to WhatsApp Business number"""
    
    access_token = os.environ.get('WHATSAPP_ACCESS_TOKEN')
    phone_number_id = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '676188225586230')
    
    if not access_token:
        print("❌ WHATSAPP_ACCESS_TOKEN environment variable not set")
        return False
        
    print(f"📱 Requesting PIN for phone number: {phone_number_id}")
    
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/request_code"
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'code_method': 'SMS',
        'language': 'en_US'
    }
    
    try:
        print("📤 Requesting PIN via SMS...")
        response = requests.post(url, json=data, headers=headers)
        
        print(f"📥 Response status: {response.status_code}")
        print(f"📋 Response body: {response.text}")
        
        if response.status_code == 200:
            print("✅ PIN request sent! Check your WhatsApp Business number for SMS.")
            print("📱 Once you receive the PIN, run: python register_whatsapp_phone.py <PIN>")
            return True
        else:
            print(f"❌ PIN request failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error requesting PIN: {str(e)}")
        return False

def check_phone_status():
    """Check current status of WhatsApp phone number"""
    
    access_token = os.environ.get('WHATSAPP_ACCESS_TOKEN')
    phone_number_id = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '676188225586230')
    
    if not access_token:
        print("❌ WHATSAPP_ACCESS_TOKEN environment variable not set")
        return False
        
    print(f"🔍 Checking status of phone number: {phone_number_id}")
    
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}"
    
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    try:
        response = requests.get(url, headers=headers)
        
        print(f"📥 Response status: {response.status_code}")
        print(f"📋 Response body: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print("📞 Phone number details:")
            print(json.dumps(result, indent=2))
            return True
        else:
            print(f"❌ Status check failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking status: {str(e)}")
        return False

if __name__ == "__main__":
    import sys
    
    print("🚀 WhatsApp Business Phone Registration Tool")
    print("=" * 50)
    
    if len(sys.argv) > 1:
        pin = sys.argv[1]
        print(f"📱 Registering with PIN: {pin}")
        register_whatsapp_phone(pin)
    else:
        print("📋 Available commands:")
        print("1. Check phone status: python register_whatsapp_phone.py status")
        print("2. Request PIN: python register_whatsapp_phone.py pin")
        print("3. Register with PIN: python register_whatsapp_phone.py <PIN_CODE>")
        
        if len(sys.argv) > 1 and sys.argv[1] == "status":
            check_phone_status()
        elif len(sys.argv) > 1 and sys.argv[1] == "pin":
            request_pin()
        else:
            print("\n📱 Run with 'pin' to request PIN or provide PIN code to register")