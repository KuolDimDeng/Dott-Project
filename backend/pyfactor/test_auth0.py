#!/usr/bin/env python
"""
Test script for Auth0 integration
Run this script to test Auth0 configuration and authentication
"""

import os
import sys
import django
from pathlib import Path

# Add the project directory to the Python path
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.auth0_authentication import Auth0JWTAuthentication, auth0_client
from django.conf import settings
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_auth0_configuration():
    """Test Auth0 configuration"""
    print("🔧 Testing Auth0 Configuration...")
    
    print(f"Auth0 Domain: {getattr(settings, 'AUTH0_DOMAIN', 'Not Set')}")
    print(f"Auth0 Client ID: {getattr(settings, 'AUTH0_CLIENT_ID', 'Not Set')}")
    print(f"Auth0 Client Secret: {'Set' if getattr(settings, 'AUTH0_CLIENT_SECRET', '') else 'Not Set'}")
    print(f"Auth0 Audience: {getattr(settings, 'AUTH0_AUDIENCE', 'Not Set (optional)')}")
    print(f"Use Auth0: {getattr(settings, 'USE_AUTH0', False)}")
    
    # Test Auth0 client initialization
    try:
        client = auth0_client
        print(f"✅ Auth0 client initialized successfully")
        print(f"   Domain: {client.domain}")
        print(f"   Client ID: {client.client_id[:10]}..." if client.client_id else "   Client ID: Not Set")
        return True
    except Exception as e:
        print(f"❌ Error initializing Auth0 client: {str(e)}")
        return False

def test_auth0_jwks():
    """Test Auth0 JWKS endpoint"""
    print("\n🔐 Testing Auth0 JWKS endpoint...")
    
    try:
        auth = Auth0JWTAuthentication()
        
        # This will fetch JWKS from Auth0
        import requests
        response = requests.get(auth.jwks_url)
        
        if response.status_code == 200:
            jwks = response.json()
            keys_count = len(jwks.get('keys', []))
            print(f"✅ Successfully fetched JWKS from {auth.jwks_url}")
            print(f"   Found {keys_count} signing keys")
            
            if keys_count > 0:
                first_key = jwks['keys'][0]
                print(f"   First key ID: {first_key.get('kid', 'N/A')}")
                print(f"   Key type: {first_key.get('kty', 'N/A')}")
                print(f"   Algorithm: {first_key.get('alg', 'N/A')}")
            
            return True
        else:
            print(f"❌ Failed to fetch JWKS: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing JWKS: {str(e)}")
        return False

def test_database_connection():
    """Test database connection and User model"""
    print("\n🗄️  Testing database connection...")
    
    try:
        from custom_auth.models import User
        
        # Test database connection
        user_count = User.objects.count()
        print(f"✅ Database connection successful")
        print(f"   Total users in database: {user_count}")
        
        # Check if auth0_sub field exists
        user_fields = [f.name for f in User._meta.get_fields()]
        if 'auth0_sub' in user_fields:
            print("✅ auth0_sub field exists in User model")
        else:
            print("⚠️  auth0_sub field not found in User model")
            print("   Run: python manage.py makemigrations && python manage.py migrate")
        
        return True
        
    except Exception as e:
        print(f"❌ Database connection error: {str(e)}")
        return False

def test_rest_framework_config():
    """Test REST framework configuration"""
    print("\n⚙️  Testing REST framework configuration...")
    
    try:
        auth_classes = settings.REST_FRAMEWORK.get('DEFAULT_AUTHENTICATION_CLASSES', [])
        print(f"✅ REST framework configured")
        print("   Authentication classes:")
        for i, auth_class in enumerate(auth_classes, 1):
            print(f"   {i}. {auth_class}")
        
        # Check if Auth0 authentication is configured
        auth0_auth_configured = any('auth0' in auth_class.lower() for auth_class in auth_classes)
        
        if auth0_auth_configured:
            print("✅ Auth0 authentication class is configured")
        else:
            print("⚠️  Auth0 authentication class not found in REST framework config")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking REST framework config: {str(e)}")
        return False

def main():
    """Main test function"""
    print("🧪 Auth0 Integration Test")
    print("=" * 50)
    
    tests = [
        test_auth0_configuration,
        test_auth0_jwks,
        test_database_connection,
        test_rest_framework_config
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
        print("🎉 All tests passed! Auth0 integration is ready.")
    else:
        print("⚠️  Some tests failed. Please check the configuration.")
    
    print("\n💡 Next steps:")
    if getattr(settings, 'USE_AUTH0', False):
        print("   1. Auth0 is enabled. Frontend should send tokens to Django API.")
        print("   2. Test API endpoints with Auth0 tokens.")
    else:
        print("   1. Set USE_AUTH0=true in environment variables.")
        print("   2. Restart Django server.")
    
    return passed == total

if __name__ == '__main__':
    main() 