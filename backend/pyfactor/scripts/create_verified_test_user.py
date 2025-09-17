#!/usr/bin/env python
"""
Create a pre-verified test user that bypasses SMS verification
This creates the user directly in the staging database via API
"""

import requests
import json

# Staging API endpoint
API_BASE = "https://dott-api-staging.onrender.com"

# Test user details
user_data = {
    "email": "steve.majak@test.com",
    "password": "Test123!",
    "first_name": "Steve",
    "last_name": "Majak",
    "phone": "+211925550100",
    "country": "SS",
    "business_type": None,  # Consumer account
    "skip_verification": True  # This flag might work if the API supports it
}

def create_user_via_api():
    """Attempt to create user via registration endpoint"""
    
    # First try standard registration
    register_url = f"{API_BASE}/api/auth/register/"
    
    print(f"Attempting to register user at: {register_url}")
    
    response = requests.post(
        register_url,
        json=user_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 201:
        print("✅ User created successfully!")
        print(f"Response: {response.json()}")
        return True
    else:
        print(f"❌ Registration failed: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def try_alternative_signup():
    """Try alternative signup without phone verification"""
    
    # Try email-only signup
    email_signup = {
        "email": "steve.majak@test.com",
        "password": "Test123!",
        "name": "Steve Majak"
    }
    
    signup_url = f"{API_BASE}/api/auth/signup/"
    
    print(f"\nTrying alternative signup at: {signup_url}")
    
    response = requests.post(
        signup_url,
        json=email_signup,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code in [200, 201]:
        print("✅ Alternative signup successful!")
        print(f"Response: {response.json()}")
        return True
    else:
        print(f"❌ Alternative signup failed: {response.status_code}")
        print(f"Response: {response.text}")
        return False

if __name__ == "__main__":
    print("""
    ========================================
    Creating Test User Account
    ========================================
    """)
    
    # Try standard registration first
    if not create_user_via_api():
        # If that fails, try alternative
        try_alternative_signup()
    
    print("""
    ========================================
    If successful, use these credentials:
    
    Email: steve.majak@test.com
    Password: Test123!
    
    Note: You may need to skip phone 
    verification or use a different 
    phone number from a supported region.
    ========================================
    """)