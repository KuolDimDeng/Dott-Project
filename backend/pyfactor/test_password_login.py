#!/usr/bin/env python
"""
Test script for password login endpoint
"""

import requests
import json
import sys

# Configuration
API_BASE_URL = "http://localhost:8000"  # Change this to your API URL
ENDPOINT = "/api/auth/password-login/"

def test_password_login(email, password):
    """Test password login endpoint"""
    url = f"{API_BASE_URL}{ENDPOINT}"
    
    payload = {
        "email": email,
        "password": password,
        "remember_me": False
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    print(f"Testing password login for: {email}")
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print("-" * 50)
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print("-" * 50)
        
        if response.status_code == 200:
            data = response.json()
            print("Login successful!")
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Check for session cookie
            if 'set-cookie' in response.headers:
                print(f"\nSession Cookie: {response.headers['set-cookie']}")
        else:
            print("Login failed!")
            try:
                error_data = response.json()
                print(f"Error Response: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Response Text: {response.text}")
                
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {str(e)}")
        return False
    
    return response.status_code == 200

if __name__ == "__main__":
    # You can pass email and password as command line arguments
    if len(sys.argv) >= 3:
        email = sys.argv[1]
        password = sys.argv[2]
    else:
        # Default test credentials (replace with your test account)
        email = input("Enter email: ")
        password = input("Enter password: ")
    
    success = test_password_login(email, password)
    sys.exit(0 if success else 1)