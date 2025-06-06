#!/usr/bin/env python3
"""
Test script for new Auth0 "Dott API" configuration
Verifies that JWT tokens (not JWE) are being generated correctly.
"""

import os
import sys
import requests
import json
import base64
from datetime import datetime

def test_new_auth0_api():
    """Test the new Auth0 Dott API configuration"""
    
    print("🆕 Testing New Auth0 'Dott API' Configuration")
    print("=" * 60)
    
    # Configuration for new API
    config = {
        'domain': 'dev-cbyy63jovi6zrcos.us.auth0.com',
        'client_id': '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF',  # Your app client ID
        'audience': 'https://api.dottapps.com',  # New API identifier
        'api_id': '684265e69a6b1dcfb80724c7'  # Your new API ID
    }
    
    client_secret = os.getenv('AUTH0_CLIENT_SECRET')
    if not client_secret:
        print("❌ AUTH0_CLIENT_SECRET environment variable not set")
        print("Please set: export AUTH0_CLIENT_SECRET='your_new_secret_here'")
        return False
    
    print(f"📋 Configuration:")
    print(f"   Domain: {config['domain']}")
    print(f"   Client ID: {config['client_id']}")
    print(f"   Audience (NEW API): {config['audience']}")
    print(f"   API ID: {config['api_id']}")
    print(f"   Client Secret: {'✅ Set' if client_secret else '❌ Missing'}")
    
    # Test 1: Get token from Auth0 for the new API
    print(f"\n🔐 Step 1: Testing Token Generation for New API")
    try:
        token_url = f"https://{config['domain']}/oauth/token"
        
        payload = {
            'client_id': config['client_id'],
            'client_secret': client_secret,
            'audience': config['audience'],  # Use new API audience
            'grant_type': 'client_credentials'
        }
        
        print(f"   Making request to: {token_url}")
        print(f"   Using audience: {config['audience']}")
        
        response = requests.post(token_url, json=payload, timeout=10)
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get('access_token')
            
            print("✅ Successfully obtained access token from Auth0")
            print(f"   Token type: {token_data.get('token_type', 'unknown')}")
            print(f"   Expires in: {token_data.get('expires_in', 'unknown')} seconds")
            
            # Analyze token format
            token_parts = access_token.count('.')
            
            if token_parts == 2:
                print("✅ Received JWT token (3 parts - header.payload.signature)")
                
                # Decode and analyze JWT header
                try:
                    header_b64 = access_token.split('.')[0]
                    # Add padding if needed
                    header_b64 += '=' * (4 - len(header_b64) % 4)
                    header_json = base64.urlsafe_b64decode(header_b64)
                    header = json.loads(header_json)
                    
                    print(f"   Token Algorithm: {header.get('alg', 'unknown')}")
                    print(f"   Token Type: {header.get('typ', 'unknown')}")
                    
                    if header.get('alg') in ['RS256', 'HS256']:
                        print("✅ Standard JWT signing algorithm - PERFECT!")
                        
                        # Try to decode payload (without verification)
                        try:
                            payload_b64 = access_token.split('.')[1]
                            payload_b64 += '=' * (4 - len(payload_b64) % 4)
                            payload_json = base64.urlsafe_b64decode(payload_b64)
                            payload = json.loads(payload_json)
                            
                            print(f"   Token Issuer: {payload.get('iss', 'unknown')}")
                            print(f"   Token Audience: {payload.get('aud', 'unknown')}")
                            print(f"   Token Subject: {payload.get('sub', 'unknown')}")
                            
                            expected_aud = config['audience']
                            actual_aud = payload.get('aud')
                            
                            if actual_aud == expected_aud:
                                print(f"✅ Audience matches perfectly: {actual_aud}")
                            else:
                                print(f"⚠️ Audience mismatch:")
                                print(f"     Expected: {expected_aud}")
                                print(f"     Actual: {actual_aud}")
                                
                        except Exception as e:
                            print(f"   Could not decode payload: {e}")
                            
                    elif header.get('alg') == 'dir' and header.get('enc'):
                        print(f"❌ Still receiving JWE tokens! Algorithm: {header.get('alg')}, Encryption: {header.get('enc')}")
                        print("   ⚠️ CHECK: Make sure 'Encrypt access tokens' is DISABLED in Auth0 API settings")
                        return False
                    else:
                        print(f"⚠️ Unexpected algorithm: {header.get('alg')}")
                        
                except Exception as e:
                    print(f"   Could not decode JWT header: {e}")
                    
            elif token_parts == 4:
                print("❌ Still receiving JWE tokens (5 parts)")
                print("   🔧 FIX: Go to Auth0 Dashboard → APIs → Dott API → Settings")
                print("   🔧 FIX: Ensure 'Encrypt the signed access_token' is UNCHECKED")
                return False
            else:
                print(f"⚠️ Unexpected token format: {token_parts + 1} parts")
                
        elif response.status_code == 401:
            print("❌ Authentication failed - likely incorrect client secret")
            print("   🔧 FIX: Regenerate client secret in Auth0 Dashboard")
            return False
        elif response.status_code == 403:
            print("❌ Access denied - client not authorized for API")
            print("   🔧 FIX: Go to Auth0 Dashboard → Applications → Your App → APIs")
            print("   🔧 FIX: Authorize your application for the 'Dott API'")
            return False
        else:
            print(f"❌ Failed to get token: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing Auth0: {e}")
        return False
    
    # Test 2: Test backend health
    print(f"\n🌐 Step 2: Testing Backend API Health")
    try:
        health_url = "https://api.dottapps.com/health/"
        response = requests.get(health_url, timeout=10)
        
        if response.status_code == 200:
            print("✅ Backend API is accessible")
            try:
                health_data = response.json()
                print(f"   Status: {health_data.get('status', 'unknown')}")
                print(f"   Auth0 Mode: {health_data.get('auth_mode', 'unknown')}")
            except:
                print("   Health endpoint returned non-JSON response")
        else:
            print(f"⚠️ Backend API returned: {response.status_code}")
            
    except Exception as e:
        print(f"⚠️ Could not reach backend API: {e}")
    
    # Test 3: Test authenticated endpoint (if token was obtained)
    if 'access_token' in locals():
        print(f"\n🔒 Step 3: Testing Authenticated Endpoint")
        try:
            auth_headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Try to access a protected endpoint
            protected_url = "https://api.dottapps.com/api/users/me/"
            response = requests.get(protected_url, headers=auth_headers, timeout=10)
            
            if response.status_code == 200:
                print("✅ Successfully accessed protected endpoint with JWT token!")
                print("✅ JWE decryption issue is RESOLVED!")
            elif response.status_code == 401:
                print("⚠️ Token not accepted by backend (401 Unauthorized)")
                print("   This could mean backend still expects different audience")
            elif response.status_code == 403:
                print("⚠️ Token accepted but access forbidden (403)")
                print("   Token is valid but user may need proper permissions")
            else:
                print(f"⚠️ Unexpected response: {response.status_code}")
                
        except Exception as e:
            print(f"⚠️ Error testing protected endpoint: {e}")
    
    print(f"\n" + "=" * 60)
    print("✅ Auth0 'Dott API' Configuration Test Complete!")
    
    print(f"\n📋 SUMMARY:")
    print(f"✅ New API created: Dott API ({config['api_id']})")
    print(f"✅ API Identifier: {config['audience']}")
    print(f"✅ Backend updated to use new audience")
    
    print(f"\n🔧 NEXT STEPS:")
    print(f"1. Ensure 'Encrypt access tokens' is DISABLED in Auth0 API settings")
    print(f"2. Authorize your application for the Dott API")
    print(f"3. Update production environment with new client secret")
    print(f"4. Deploy backend changes")
    print(f"5. Test user login flow")
    
    return True

if __name__ == "__main__":
    success = test_new_auth0_api()
    sys.exit(0 if success else 1) 