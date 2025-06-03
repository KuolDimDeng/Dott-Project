#!/usr/bin/env python
"""
Simple Auth0 test without Django setup
Tests basic Auth0 configuration and JWKS endpoint
"""

import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

def test_auth0_config():
    """Test Auth0 configuration"""
    print("🔧 Testing Auth0 Configuration...")
    
    # Get Auth0 settings
    auth0_domain = os.getenv('AUTH0_DOMAIN', 'dev-cbyy63jovi6zrcos.us.auth0.com')
    auth0_client_id = os.getenv('AUTH0_CLIENT_ID', 'GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ')
    auth0_client_secret = os.getenv('AUTH0_CLIENT_SECRET', '')
    auth0_audience = os.getenv('AUTH0_AUDIENCE', None)
    use_auth0 = os.getenv('USE_AUTH0', 'true').lower() in ('true', '1', 'yes')
    
    print(f"Domain: {auth0_domain}")
    print(f"Client ID: {auth0_client_id}")
    print(f"Client Secret: {'Set' if auth0_client_secret else 'Not Set'}")
    print(f"Audience: {auth0_audience or 'Not Set (optional)'}")
    print(f"Use Auth0: {use_auth0}")
    
    return auth0_domain, auth0_client_id

def test_auth0_jwks(domain):
    """Test Auth0 JWKS endpoint"""
    print(f"\n🔐 Testing Auth0 JWKS endpoint...")
    
    jwks_url = f'https://{domain}/.well-known/jwks.json'
    
    try:
        response = requests.get(jwks_url, timeout=10)
        
        if response.status_code == 200:
            jwks = response.json()
            keys_count = len(jwks.get('keys', []))
            print(f"✅ Successfully fetched JWKS from {jwks_url}")
            print(f"   Found {keys_count} signing keys")
            
            if keys_count > 0:
                first_key = jwks['keys'][0]
                print(f"   First key ID: {first_key.get('kid', 'N/A')}")
                print(f"   Key type: {first_key.get('kty', 'N/A')}")
                print(f"   Algorithm: {first_key.get('alg', 'N/A')}")
                print(f"   Use: {first_key.get('use', 'N/A')}")
            
            return True
        else:
            print(f"❌ Failed to fetch JWKS: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching JWKS: {str(e)}")
        return False

def test_auth0_openid_config(domain):
    """Test Auth0 OpenID Connect configuration"""
    print(f"\n🔧 Testing Auth0 OpenID Connect configuration...")
    
    config_url = f'https://{domain}/.well-known/openid_configuration'
    
    try:
        response = requests.get(config_url, timeout=10)
        
        if response.status_code == 200:
            config = response.json()
            print(f"✅ Successfully fetched OpenID config from {config_url}")
            print(f"   Issuer: {config.get('issuer', 'N/A')}")
            print(f"   Auth endpoint: {config.get('authorization_endpoint', 'N/A')}")
            print(f"   Token endpoint: {config.get('token_endpoint', 'N/A')}")
            print(f"   Userinfo endpoint: {config.get('userinfo_endpoint', 'N/A')}")
            print(f"   JWKS URI: {config.get('jwks_uri', 'N/A')}")
            
            supported_algs = config.get('id_token_signing_alg_values_supported', [])
            print(f"   Supported algorithms: {', '.join(supported_algs)}")
            
            return True
        else:
            print(f"❌ Failed to fetch OpenID config: HTTP {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching OpenID config: {str(e)}")
        return False

def test_auth0_domain_reachability(domain):
    """Test if Auth0 domain is reachable"""
    print(f"\n🌐 Testing Auth0 domain reachability...")
    
    try:
        response = requests.get(f'https://{domain}', timeout=10)
        
        if response.status_code in [200, 302, 404]:  # These are all valid responses
            print(f"✅ Auth0 domain is reachable: {domain}")
            print(f"   HTTP Status: {response.status_code}")
            return True
        else:
            print(f"⚠️  Unexpected response from Auth0 domain: HTTP {response.status_code}")
            return True  # Still consider it reachable
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Auth0 domain not reachable: {str(e)}")
        return False

def main():
    """Main test function"""
    print("🧪 Simple Auth0 Configuration Test")
    print("=" * 50)
    
    # Test configuration
    domain, client_id = test_auth0_config()
    
    # Run tests
    tests = [
        lambda: test_auth0_domain_reachability(domain),
        lambda: test_auth0_openid_config(domain),
        lambda: test_auth0_jwks(domain),
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    passed = sum(results)
    total = len(results)
    
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! Auth0 is properly configured and accessible.")
        print("\n💡 Next steps:")
        print("   1. The Auth0 domain is reachable")
        print("   2. JWKS endpoint is working")
        print("   3. Ready for Django integration")
    else:
        print("⚠️  Some tests failed. Please check your Auth0 configuration.")
    
    return passed == total

if __name__ == '__main__':
    main() 