#!/usr/bin/env python3
"""
Test script to verify Auth0 JWE token decryption fix
Run this after updating the client secret to verify the fix worked.
"""

import os
import sys
import requests
import json

def test_auth0_fix():
    """Test if Auth0 client secret fix resolved JWE decryption"""
    
    print("🔧 Testing Auth0 JWE Token Decryption Fix")
    print("=" * 50)
    
    # Check if environment variables are set
    required_vars = [
        'AUTH0_DOMAIN',
        'AUTH0_CLIENT_ID', 
        'AUTH0_CLIENT_SECRET',
        'AUTH0_AUDIENCE'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please set these in your .env file or environment")
        return False
    
    # Test 1: Check Auth0 configuration
    print("\n📋 Step 1: Checking Auth0 Configuration")
    print(f"   Domain: {os.getenv('AUTH0_DOMAIN')}")
    print(f"   Client ID: {os.getenv('AUTH0_CLIENT_ID')}")
    print(f"   Audience: {os.getenv('AUTH0_AUDIENCE')}")
    print(f"   Client Secret: {'✅ Set' if os.getenv('AUTH0_CLIENT_SECRET') else '❌ Missing'}")
    
    # Test 2: Try to get a token from Auth0
    print("\n🔐 Step 2: Testing Auth0 Token Generation")
    try:
        token_url = f"https://{os.getenv('AUTH0_DOMAIN')}/oauth/token"
        
        payload = {
            'client_id': os.getenv('AUTH0_CLIENT_ID'),
            'client_secret': os.getenv('AUTH0_CLIENT_SECRET'),
            'audience': os.getenv('AUTH0_AUDIENCE'),
            'grant_type': 'client_credentials'
        }
        
        response = requests.post(token_url, json=payload)
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get('access_token')
            
            print("✅ Successfully obtained access token from Auth0")
            
            # Check token type
            if access_token.count('.') == 2:
                print("✅ Received JWT token (3 parts)")
                
                # Try to decode header
                try:
                    import base64
                    header = json.loads(base64.urlsafe_b64decode(access_token.split('.')[0] + '=='))
                    print(f"   Token algorithm: {header.get('alg', 'unknown')}")
                    
                    if header.get('alg') in ['RS256', 'HS256']:
                        print("✅ Token uses standard JWT signing")
                    elif header.get('alg') == 'dir' and header.get('enc'):
                        print("❌ Still receiving JWE tokens!")
                        return False
                        
                except Exception as e:
                    print(f"   Could not decode token header: {e}")
                    
            elif access_token.count('.') == 4:
                print("❌ Still receiving JWE tokens (5 parts)")
                return False
            else:
                print(f"⚠️ Unexpected token format: {access_token.count('.') + 1} parts")
                
        else:
            print(f"❌ Failed to get token from Auth0: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing Auth0: {e}")
        return False
    
    # Test 3: Test API endpoint health
    print("\n🌐 Step 3: Testing API Endpoint Health")
    try:
        api_url = "https://api.dottapps.com/health/"
        response = requests.get(api_url, timeout=10)
        
        if response.status_code == 200:
            print("✅ Backend API is accessible")
        else:
            print(f"⚠️ Backend API returned: {response.status_code}")
            
    except Exception as e:
        print(f"⚠️ Could not reach backend API: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Auth0 client secret fix verification complete!")
    print("\nNext steps:")
    print("1. Deploy the updated client secret to production")
    print("2. Test user login flow")
    print("3. Check backend logs for successful JWE decryption")
    
    return True

if __name__ == "__main__":
    # Load environment variables
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print("Note: python-dotenv not installed, using system environment variables")
    
    success = test_auth0_fix()
    sys.exit(0 if success else 1) 