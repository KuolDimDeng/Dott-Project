#!/usr/bin/env python3
"""Test script to verify session API response"""
import requests
import json
from datetime import datetime

# Test configuration
BASE_URL = "https://api.dottapps.com"
TEST_EMAIL = "support@dottapps.com"

def test_session_create():
    """Test the session creation endpoint"""
    print(f"\n{'='*60}")
    print("Testing Session Creation Endpoint")
    print(f"{'='*60}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Endpoint: {BASE_URL}/api/sessions/create/")
    print(f"Testing with email: {TEST_EMAIL}")
    
    # Prepare request
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    payload = {
        "auth_sub": f"auth0|test_{TEST_EMAIL}",  # Mock Auth0 sub
        "email": TEST_EMAIL,
        "session_type": "mobile"
    }
    
    print(f"\nRequest payload:")
    print(json.dumps(payload, indent=2))
    
    try:
        # Make request
        response = requests.post(
            f"{BASE_URL}/api/sessions/create/",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers:")
        for key, value in response.headers.items():
            if key.lower() in ['content-type', 'date', 'server']:
                print(f"  {key}: {value}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"\nResponse Data:")
            print(json.dumps(data, indent=2))
            
            # Check for specific fields
            print(f"\n{'='*60}")
            print("Field Verification:")
            print(f"{'='*60}")
            
            user_data = data.get('user', {})
            print(f"✓ User ID: {user_data.get('id', 'MISSING')}")
            print(f"✓ Email: {user_data.get('email', 'MISSING')}")
            print(f"✓ Role: {user_data.get('role', 'MISSING')}")
            print(f"✓ Has Business: {user_data.get('has_business', 'MISSING')}")
            
            tenant_data = data.get('tenant', {})
            print(f"✓ Tenant ID: {tenant_data.get('id', 'MISSING')}")
            print(f"✓ Tenant Name: {tenant_data.get('name', 'MISSING')}")
            
            # Check if fields are missing
            missing_fields = []
            if 'role' not in user_data:
                missing_fields.append('role')
            if 'has_business' not in user_data:
                missing_fields.append('has_business')
            
            if missing_fields:
                print(f"\n⚠️ WARNING: Missing fields: {', '.join(missing_fields)}")
            else:
                print(f"\n✅ All required fields present!")
                
        else:
            print(f"\n❌ Error Response:")
            try:
                error_data = response.json()
                print(json.dumps(error_data, indent=2))
            except:
                print(response.text)
                
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Request Failed: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")

def test_user_profile():
    """Test the user profile endpoint"""
    print(f"\n{'='*60}")
    print("Testing User Profile Endpoint")
    print(f"{'='*60}")
    print(f"Endpoint: {BASE_URL}/api/users/me/")
    
    # Note: This would need a valid session token to work
    print("Note: This endpoint requires authentication")
    print("Skipping actual test as it needs a valid session token")

if __name__ == "__main__":
    print(f"\n{'='*60}")
    print("BACKEND API TEST SCRIPT")
    print(f"{'='*60}")
    print(f"Testing against: {BASE_URL}")
    
    # Run tests
    test_session_create()
    test_user_profile()
    
    print(f"\n{'='*60}")
    print("TEST COMPLETE")
    print(f"{'='*60}\n")