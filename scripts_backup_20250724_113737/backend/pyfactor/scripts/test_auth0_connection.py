#!/usr/bin/env python
"""
Test Auth0 Management API connection
"""
import os
import sys
import django
import requests
from django.conf import settings

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def test_auth0_connection():
    """Test Auth0 Management API connection"""
    print("\n" + "="*60)
    print("Testing Auth0 Management API Connection")
    print("="*60)
    
    # Get configuration
    auth0_tenant_domain = getattr(settings, 'AUTH0_TENANT_DOMAIN', 'dev-cbyy63jovi6zrcos.us.auth0.com')
    client_id = getattr(settings, 'AUTH0_MANAGEMENT_CLIENT_ID', None)
    client_secret = getattr(settings, 'AUTH0_MANAGEMENT_CLIENT_SECRET', None)
    
    print(f"\n📋 Configuration:")
    print(f"  Tenant Domain: {auth0_tenant_domain}")
    print(f"  Client ID: {client_id}")
    print(f"  Client Secret: {'*' * 8 if client_secret else 'NOT SET'}")
    
    if not all([auth0_tenant_domain, client_id, client_secret]):
        print("\n❌ Missing Auth0 configuration!")
        return
    
    # Test getting Management API token
    print(f"\n🔗 Testing Management API token endpoint...")
    
    token_url = f"https://{auth0_tenant_domain}/oauth/token"
    token_payload = {
        'client_id': client_id,
        'client_secret': client_secret,
        'audience': f"https://{auth0_tenant_domain}/api/v2/",
        'grant_type': 'client_credentials'
    }
    
    print(f"  URL: {token_url}")
    print(f"  Audience: {token_payload['audience']}")
    
    try:
        response = requests.post(token_url, json=token_payload, timeout=10)
        
        print(f"\n📡 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Successfully obtained Management API token!")
            token_data = response.json()
            print(f"  Token Type: {token_data.get('token_type')}")
            print(f"  Expires In: {token_data.get('expires_in')} seconds")
            print(f"  Scope: {token_data.get('scope', 'N/A')[:50]}...")
            
            # Test creating a test user (dry run)
            access_token = token_data.get('access_token')
            users_url = f"https://{auth0_tenant_domain}/api/v2/users"
            
            print(f"\n🧪 Testing user creation endpoint (GET only)...")
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Just test if we can access the users endpoint
            test_response = requests.get(users_url + "?q=email:test@nonexistent.com", headers=headers, timeout=10)
            
            if test_response.status_code == 200:
                print("✅ Can access users endpoint successfully!")
            else:
                print(f"⚠️  Users endpoint returned: {test_response.status_code}")
                print(f"   Response: {test_response.text[:200]}...")
                
        else:
            print(f"❌ Failed to get Management API token!")
            print(f"   Response: {response.text}")
            
            # Common error explanations
            if response.status_code == 401:
                print("\n💡 401 Unauthorized: Check your client credentials")
            elif response.status_code == 403:
                print("\n💡 403 Forbidden: Check if the M2M app has the right scopes")
            elif response.status_code == 404:
                print("\n💡 404 Not Found: Check the Auth0 domain")
                
    except Exception as e:
        print(f"\n❌ Error testing Auth0 connection: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    test_auth0_connection()