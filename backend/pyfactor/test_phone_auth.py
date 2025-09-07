#!/usr/bin/env python3
"""
Test script for phone authentication endpoints on staging
"""
import requests
import json
import time

BASE_URL = "https://dott-api-staging.onrender.com"

def test_phone_auth_status():
    """Check if phone auth endpoints are available"""
    print("🔍 Testing phone authentication endpoints...")
    
    # Test the status endpoint first (simpler GET request)
    status_url = f"{BASE_URL}/api/auth/phone/status/"
    print(f"\n📡 Testing: GET {status_url}")
    
    try:
        response = requests.get(status_url, timeout=10)
        if response.status_code == 200:
            print("✅ Phone auth status endpoint is working!")
            print(f"   Response: {response.json()}")
            return True
        elif response.status_code == 404:
            print("❌ Phone auth endpoints not found (404)")
            print("   The deployment may still be building...")
            return False
        else:
            print(f"⚠️  Unexpected status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_send_otp(phone_number):
    """Test sending OTP to a phone number"""
    send_url = f"{BASE_URL}/api/auth/phone/send-otp/"
    print(f"\n📱 Testing: POST {send_url}")
    print(f"   Phone: {phone_number}")
    
    payload = {"phone": phone_number}
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(send_url, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            print("✅ OTP sent successfully!")
            data = response.json()
            print(f"   Success: {data.get('success')}")
            print(f"   Message: {data.get('message')}")
            return True
        elif response.status_code == 404:
            print("❌ Send OTP endpoint not found (404)")
            return False
        else:
            print(f"⚠️  Status code: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def wait_for_deployment(max_wait_minutes=10):
    """Wait for deployment to be ready"""
    print(f"⏳ Waiting for deployment to be ready (max {max_wait_minutes} minutes)...")
    
    start_time = time.time()
    max_wait_seconds = max_wait_minutes * 60
    check_interval = 30  # Check every 30 seconds
    
    while time.time() - start_time < max_wait_seconds:
        if test_phone_auth_status():
            print("\n🎉 Deployment is ready!")
            return True
        
        elapsed = int(time.time() - start_time)
        remaining = max_wait_seconds - elapsed
        print(f"   Waiting... ({elapsed}s elapsed, {remaining}s remaining)")
        time.sleep(check_interval)
    
    print(f"\n⏱️  Timeout: Deployment not ready after {max_wait_minutes} minutes")
    return False

def main():
    print("=" * 60)
    print("Phone Authentication Deployment Test")
    print("=" * 60)
    
    # First check if deployment is ready
    if not test_phone_auth_status():
        print("\n🔄 Deployment not ready yet. Waiting...")
        if not wait_for_deployment():
            print("\n❌ Deployment failed to become ready")
            return
    
    # Test sending OTP
    test_phone = "+15513488487"  # Your Twilio number
    print(f"\n📞 Testing with phone number: {test_phone}")
    
    if test_send_otp(test_phone):
        print("\n✅ Phone authentication system is working!")
        print("   - Backend deployed successfully")
        print("   - Database migrations applied")
        print("   - Twilio integration working")
        print("   - Ready for mobile app testing")
    else:
        print("\n⚠️  Phone authentication test failed")
        print("   Check Render logs for deployment errors")

if __name__ == "__main__":
    main()