#!/usr/bin/env python3
"""
Test Auth0 Password Grant authentication
This helps diagnose why password login is failing
"""

import requests
import json
import sys
import os
from datetime import datetime

# Auth0 Configuration
AUTH0_DOMAIN = "dev-cbyy63jovi6zrcos.us.auth0.com"
AUTH0_CLIENT_ID = "9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF"
AUTH0_AUDIENCE = "https://api.dottapps.com"

def test_password_grant(email, password, client_secret):
    """Test Auth0 password grant authentication"""
    
    print(f"\n{'='*60}")
    print(f"Testing Auth0 Password Grant Authentication")
    print(f"{'='*60}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Domain: {AUTH0_DOMAIN}")
    print(f"Client ID: {AUTH0_CLIENT_ID}")
    print(f"Email: {email}")
    print(f"Password length: {len(password)}")
    print(f"Audience: {AUTH0_AUDIENCE}")
    print(f"{'='*60}\n")
    
    # Prepare the request
    url = f"https://{AUTH0_DOMAIN}/oauth/token"
    payload = {
        "grant_type": "password",
        "username": email,
        "password": password,
        "client_id": AUTH0_CLIENT_ID,
        "client_secret": client_secret,
        "audience": AUTH0_AUDIENCE,
        "scope": "openid profile email"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    print("Request URL:", url)
    print("Request payload (password hidden):")
    safe_payload = payload.copy()
    safe_payload['password'] = '***hidden***'
    safe_payload['client_secret'] = '***hidden***'
    print(json.dumps(safe_payload, indent=2))
    print()
    
    # Make the request
    print("Sending request to Auth0...")
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("\n✅ SUCCESS! Authentication successful!")
            data = response.json()
            print("\nResponse data:")
            print(f"- Access Token: {data.get('access_token', 'N/A')[:50]}...")
            print(f"- Token Type: {data.get('token_type', 'N/A')}")
            print(f"- Expires In: {data.get('expires_in', 'N/A')} seconds")
            print(f"- Scope: {data.get('scope', 'N/A')}")
            
            # Test userinfo endpoint
            if data.get('access_token'):
                print("\nTesting userinfo endpoint...")
                userinfo_response = requests.get(
                    f"https://{AUTH0_DOMAIN}/userinfo",
                    headers={'Authorization': f"Bearer {data['access_token']}"},
                    timeout=10
                )
                if userinfo_response.status_code == 200:
                    userinfo = userinfo_response.json()
                    print("✅ Userinfo retrieved successfully:")
                    print(f"- Sub: {userinfo.get('sub', 'N/A')}")
                    print(f"- Email: {userinfo.get('email', 'N/A')}")
                    print(f"- Email Verified: {userinfo.get('email_verified', 'N/A')}")
                    print(f"- Name: {userinfo.get('name', 'N/A')}")
                else:
                    print(f"❌ Userinfo failed: {userinfo_response.status_code}")
                    print(userinfo_response.text)
            
            return True
        else:
            print(f"\n❌ FAILED! Status: {response.status_code}")
            print("\nResponse body:")
            try:
                error_data = response.json()
                print(json.dumps(error_data, indent=2))
                
                # Provide specific guidance based on error
                error_code = error_data.get('error', '')
                error_desc = error_data.get('error_description', '')
                
                print(f"\n{'='*60}")
                print("DIAGNOSIS:")
                print(f"{'='*60}")
                
                if error_code == 'access_denied':
                    if 'Wrong email or password' in error_desc:
                        print("❌ Invalid credentials - the email or password is incorrect")
                        print("\nPossible solutions:")
                        print("1. Reset the password at: https://dottapps.com/auth/forgot-password")
                        print("2. Check if caps lock is on")
                        print("3. Ensure there are no extra spaces in email/password")
                    elif 'Grant type' in error_desc:
                        print("❌ Password Grant is NOT enabled for this application!")
                        print("\nTo fix this:")
                        print("1. Go to Auth0 Dashboard > Applications > Your App > Settings")
                        print("2. Scroll to 'Advanced Settings' at the bottom")
                        print("3. Click on 'Grant Types' tab")
                        print("4. Enable 'Password' checkbox")
                        print("5. Save changes")
                elif error_code == 'unauthorized_client':
                    print("❌ Client is not authorized for password grant")
                    print("\nThis means the Auth0 application doesn't have password grant enabled.")
                    print("Enable it in Auth0 Dashboard > Applications > Settings > Advanced > Grant Types")
                elif error_code == 'invalid_client':
                    print("❌ Invalid client credentials")
                    print("\nThe client_id or client_secret is incorrect.")
                    print("Check your Auth0 application settings.")
                elif 'email_not_verified' in error_desc:
                    print("❌ Email not verified")
                    print("\nThe user needs to verify their email address.")
                    print("Check email for verification link or resend from Auth0 dashboard.")
                elif 'blocked' in error_desc.lower():
                    print("❌ User is blocked")
                    print("\nThe user account has been blocked in Auth0.")
                    print("Unblock in Auth0 Dashboard > User Management > Users")
                else:
                    print(f"❌ Error: {error_code}")
                    print(f"Description: {error_desc}")
                
            except:
                print(response.text)
            
            return False
            
    except requests.exceptions.Timeout:
        print("\n❌ Request timed out")
        return False
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Request failed: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("Auth0 Password Grant Test Tool")
    print("="*60)
    
    # Get credentials
    email = input("Enter email (default: support@dottapps.com): ").strip()
    if not email:
        email = "support@dottapps.com"
    
    password = input("Enter password: ").strip()
    if not password:
        print("❌ Password is required")
        sys.exit(1)
    
    # Try to get client secret from environment or ask user
    client_secret = os.environ.get('AUTH0_CLIENT_SECRET', '')
    if not client_secret:
        client_secret = input("Enter Auth0 Client Secret: ").strip()
        if not client_secret:
            print("❌ Client secret is required")
            print("You can find it in Auth0 Dashboard > Applications > Your App > Settings")
            sys.exit(1)
    
    # Run the test
    success = test_password_grant(email, password, client_secret)
    
    print(f"\n{'='*60}")
    if success:
        print("✅ AUTHENTICATION TEST PASSED!")
        print("\nThe credentials are correct and Auth0 is properly configured.")
        print("The issue might be in the frontend-backend communication.")
    else:
        print("❌ AUTHENTICATION TEST FAILED!")
        print("\nPlease check the diagnosis above and follow the suggested solutions.")
    print(f"{'='*60}\n")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())