#!/usr/bin/env python
"""
Create test consumer account via API without SMS verification
"""
import requests
import json

# API endpoint - using staging
API_BASE = "https://staging.dottapps.com/api"

def create_test_consumer():
    """Create John Peter consumer account via API"""

    # Step 1: Try to create user with email/password (bypass phone verification)
    signup_data = {
        "email": "johnpeter.test@dottapps.com",
        "password": "Test123!",
        "name": "John Peter",
        "phone": "+211921234567",  # Will be added but not verified
        "skip_phone_verification": True
    }

    print("Creating test consumer account...")

    # Try Auth0 signup endpoint
    auth0_signup = {
        "email": "johnpeter.test@dottapps.com",
        "password": "Test123!",
        "connection": "Username-Password-Authentication",
        "name": "John Peter"
    }

    # First try direct Auth0 signup
    auth0_url = "https://dev-cbyy63jovi6zrcos.us.auth0.com/dbconnections/signup"

    response = requests.post(
        auth0_url,
        json=auth0_signup,
        headers={
            "Content-Type": "application/json"
        }
    )

    if response.status_code in [200, 201]:
        print("✅ Auth0 account created successfully!")
        print(f"Response: {response.json()}")

        # Now login to get session
        login_data = {
            "email": "johnpeter.test@dottapps.com",
            "password": "Test123!"
        }

        login_response = requests.post(
            f"{API_BASE}/auth/login/",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )

        if login_response.status_code == 200:
            print("✅ Login successful!")

            # Update profile with phone
            session = login_response.cookies.get('sid')
            if session:
                profile_update = {
                    "phone": "+211921234567",
                    "first_name": "John",
                    "last_name": "Peter",
                    "is_consumer": True,
                    "user_mode": "consumer"
                }

                update_response = requests.patch(
                    f"{API_BASE}/users/me/",
                    json=profile_update,
                    headers={
                        "Content-Type": "application/json",
                        "Cookie": f"sid={session}"
                    }
                )

                if update_response.status_code == 200:
                    print("✅ Profile updated with phone number!")
                else:
                    print(f"⚠️ Profile update status: {update_response.status_code}")
        else:
            print(f"⚠️ Login status: {login_response.status_code}")
    else:
        print(f"❌ Auth0 signup failed: {response.status_code}")
        print(f"Response: {response.text}")

        # Check if user already exists
        if "The user already exists" in response.text or response.status_code == 400:
            print("\n✅ User might already exist. Try logging in with:")
            print("Email: johnpeter.test@dottapps.com")
            print("Password: Test123!")

if __name__ == "__main__":
    print("""
    ========================================
    Creating Test Consumer Account
    ========================================
    """)

    create_test_consumer()

    print("""
    ========================================
    Test Account Credentials:

    Email: johnpeter.test@dottapps.com
    Password: Test123!
    Phone: +211921234567
    Name: John Peter

    Note: Use email/password to login
    Phone verification is bypassed for testing
    ========================================
    """)