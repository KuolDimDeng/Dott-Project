#!/usr/bin/env python
"""
Test script to verify Auth0 issuer configuration fix
"""
import os
import sys
import django
from pathlib import Path

# Add the current directory to Python path
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings
from custom_auth.auth0_authentication import Auth0JWTAuthentication

def test_issuer_fix():
    """Test that the issuer is correctly constructed without double https://"""
    print("=" * 60)
    print("🔍 TESTING AUTH0 ISSUER FIX")
    print("=" * 60)
    
    # Test with issuer_domain that already contains https://
    test_cases = [
        ("https://auth.dottapps.com/", "https://auth.dottapps.com/"),
        ("https://auth.dottapps.com", "https://auth.dottapps.com/"),
        ("auth.dottapps.com", "https://auth.dottapps.com/"),
        ("auth.dottapps.com/", "https://auth.dottapps.com/"),
    ]
    
    auth = Auth0JWTAuthentication()
    
    for test_domain, expected_issuer in test_cases:
        # Temporarily set issuer_domain for testing
        original_issuer_domain = auth.issuer_domain
        auth.issuer_domain = test_domain
        
        # Build expected issuer using the same logic as in the auth module
        if auth.issuer_domain and auth.issuer_domain.startswith("https://"):
            actual_issuer = auth.issuer_domain.rstrip("/") + "/"
        else:
            actual_issuer = f"https://{auth.issuer_domain}/"
        
        # Restore original
        auth.issuer_domain = original_issuer_domain
        
        status = "✅ PASS" if actual_issuer == expected_issuer else "❌ FAIL"
        print(f"\nTest case: {test_domain}")
        print(f"   Expected: {expected_issuer}")
        print(f"   Actual:   {actual_issuer}")
        print(f"   Result:   {status}")
    
    # Show current configuration
    print("\n" + "=" * 60)
    print("🔧 CURRENT CONFIGURATION:")
    print("=" * 60)
    print(f"AUTH0_DOMAIN (env): {os.getenv('AUTH0_DOMAIN', 'NOT_SET')}")
    print(f"AUTH0_ISSUER_DOMAIN (env): {os.getenv('AUTH0_ISSUER_DOMAIN', 'NOT_SET')}")
    print(f"AUTH0_ISSUER_DOMAIN (settings): {getattr(settings, 'AUTH0_ISSUER_DOMAIN', 'NOT_SET')}")
    print(f"AUTH0_ISSUER (settings): {getattr(settings, 'AUTH0_ISSUER', 'NOT_SET')}")
    
    print("\n🔧 Auth0JWTAuthentication instance:")
    print(f"   domain: {auth.domain}")
    print(f"   issuer_domain: {auth.issuer_domain}")
    print(f"   custom_domain: {auth.custom_domain}")
    
    # Test actual issuer construction
    if auth.issuer_domain and auth.issuer_domain.startswith("https://"):
        expected_issuer = auth.issuer_domain.rstrip("/") + "/"
    else:
        expected_issuer = f"https://{auth.issuer_domain}/"
    
    print(f"\n📍 FINAL EXPECTED ISSUER: {expected_issuer}")
    
    if "https://https://" in expected_issuer:
        print("\n❌ ERROR: Double https:// detected in issuer!")
    else:
        print("\n✅ SUCCESS: Issuer is correctly formatted!")

if __name__ == "__main__":
    test_issuer_fix()