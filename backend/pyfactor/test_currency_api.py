#!/usr/bin/env python
"""
Test script to verify currency API functionality
"""
import requests
import json
import sys

# Configuration
API_BASE_URL = "https://api.dottapps.com"
SESSION_ID = "your_session_id_here"  # Replace with actual session ID

def test_currency_preferences():
    """Test getting and updating currency preferences"""
    
    print("=== CURRENCY API TEST ===")
    print(f"API URL: {API_BASE_URL}")
    print()
    
    # Test 1: GET current preferences
    print("1. Testing GET /api/currency/preferences/")
    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': f'Session {SESSION_ID}',
        'Cookie': f'sid={SESSION_ID}',
    }
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/currency/preferences/",
            headers=headers,
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("   ✅ GET successful")
                print(f"   Current currency: {data.get('preferences', {}).get('currency_code')}")
            else:
                print("   ❌ GET failed:", data.get('error'))
        else:
            print(f"   ❌ HTTP {response.status_code} error")
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
    
    print()
    
    # Test 2: PUT to update currency
    print("2. Testing PUT /api/currency/preferences/ (change to SSP)")
    update_data = {
        "currency_code": "SSP"
    }
    
    try:
        response = requests.put(
            f"{API_BASE_URL}/api/currency/preferences/",
            headers=headers,
            json=update_data,
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("   ✅ PUT successful")
                print(f"   Updated currency: {data.get('preferences', {}).get('currency_code')}")
            else:
                print("   ❌ PUT failed:", data.get('error'))
        else:
            print(f"   ❌ HTTP {response.status_code} error")
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
    
    print()
    
    # Test 3: GET again to verify persistence
    print("3. Testing GET again to verify persistence")
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/currency/preferences/",
            headers=headers,
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                current_currency = data.get('preferences', {}).get('currency_code')
                print(f"   Current currency after update: {current_currency}")
                if current_currency == 'SSP':
                    print("   ✅ Currency persisted successfully!")
                else:
                    print("   ❌ Currency did not persist (reverted to {current_currency})")
            else:
                print("   ❌ GET failed:", data.get('error'))
        else:
            print(f"   ❌ HTTP {response.status_code} error")
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
    
    print()
    print("=== TEST COMPLETE ===")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        SESSION_ID = sys.argv[1]
    else:
        print("Usage: python test_currency_api.py <session_id>")
        print("To get your session ID:")
        print("1. Open browser developer tools (F12)")
        print("2. Go to Application/Storage -> Cookies")
        print("3. Find the 'sid' cookie value")
        sys.exit(1)
    
    test_currency_preferences()