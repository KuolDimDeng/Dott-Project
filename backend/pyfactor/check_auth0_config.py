#!/usr/bin/env python
"""
Check Auth0 configuration
"""
import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.conf import settings
import requests

def check_auth0_config():
    """Check Auth0 configuration and connectivity"""
    print("🔍 CHECKING AUTH0 CONFIGURATION")
    print("=" * 60)
    
    # 1. Check environment variables
    print("\n1. Environment Variables:")
    auth0_vars = {
        'AUTH0_DOMAIN': os.environ.get('AUTH0_DOMAIN'),
        'AUTH0_CUSTOM_DOMAIN': os.environ.get('AUTH0_CUSTOM_DOMAIN'),
        'AUTH0_ISSUER_DOMAIN': os.environ.get('AUTH0_ISSUER_DOMAIN'),
        'AUTH0_AUDIENCE': os.environ.get('AUTH0_AUDIENCE'),
        'AUTH0_CLIENT_ID': os.environ.get('AUTH0_CLIENT_ID'),
        'AUTH0_CLIENT_SECRET': os.environ.get('AUTH0_CLIENT_SECRET'),
    }
    
    for var, value in auth0_vars.items():
        if value:
            if 'SECRET' in var:
                print(f"   {var}: {'*' * 10} (hidden)")
            else:
                print(f"   {var}: {value}")
        else:
            print(f"   {var}: ❌ NOT SET")
    
    # 2. Check Django settings
    print("\n2. Django Settings:")
    django_settings = {
        'AUTH0_DOMAIN': getattr(settings, 'AUTH0_DOMAIN', None),
        'AUTH0_CUSTOM_DOMAIN': getattr(settings, 'AUTH0_CUSTOM_DOMAIN', None),
        'AUTH0_ISSUER_DOMAIN': getattr(settings, 'AUTH0_ISSUER_DOMAIN', None),
        'AUTH0_AUDIENCE': getattr(settings, 'AUTH0_AUDIENCE', None),
        'AUTH0_CLIENT_ID': getattr(settings, 'AUTH0_CLIENT_ID', None),
        'AUTH0_CLIENT_SECRET': getattr(settings, 'AUTH0_CLIENT_SECRET', None),
    }
    
    for var, value in django_settings.items():
        if value:
            if 'SECRET' in var:
                print(f"   {var}: {'*' * 10} (hidden)")
            else:
                print(f"   {var}: {value}")
        else:
            print(f"   {var}: ❌ NOT SET")
    
    # 3. Check JWKS endpoint
    print("\n3. JWKS Endpoint Check:")
    domain = getattr(settings, 'AUTH0_DOMAIN', None)
    if domain:
        jwks_url = f"https://{domain}/.well-known/jwks.json"
        print(f"   JWKS URL: {jwks_url}")
        
        try:
            response = requests.get(jwks_url, timeout=5)
            if response.status_code == 200:
                print(f"   ✅ JWKS endpoint accessible")
                jwks_data = response.json()
                print(f"   Keys found: {len(jwks_data.get('keys', []))}")
            else:
                print(f"   ❌ JWKS endpoint returned: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error accessing JWKS: {e}")
    
    # 4. Check if custom domain is configured
    print("\n4. Domain Configuration:")
    custom_domain = getattr(settings, 'AUTH0_CUSTOM_DOMAIN', None)
    issuer_domain = getattr(settings, 'AUTH0_ISSUER_DOMAIN', None)
    
    if custom_domain and custom_domain != domain:
        print(f"   ⚠️  Custom domain configured: {custom_domain}")
        print(f"   This might cause token validation issues")
    
    if issuer_domain and issuer_domain != domain:
        print(f"   ⚠️  Different issuer domain: {issuer_domain}")
        print(f"   Make sure tokens are issued with this domain")
    
    # 5. Check audience configuration
    print("\n5. Audience Configuration:")
    audience = getattr(settings, 'AUTH0_AUDIENCE', None)
    if audience:
        print(f"   Audience: {audience}")
        print(f"   ⚠️  Make sure frontend requests tokens with this audience")
    else:
        print(f"   ❌ No audience configured - this will cause authentication to fail")
    
    print("\n" + "=" * 60)
    print("CONFIGURATION SUMMARY:")
    
    # Check for common issues
    issues = []
    if not domain:
        issues.append("AUTH0_DOMAIN is not set")
    if not audience:
        issues.append("AUTH0_AUDIENCE is not set")
    if not getattr(settings, 'AUTH0_CLIENT_ID', None):
        issues.append("AUTH0_CLIENT_ID is not set")
    
    if issues:
        print("\n❌ ISSUES FOUND:")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("\n✅ Basic configuration looks correct")
        print("\nNext steps:")
        print("1. Ensure frontend requests tokens with audience:", audience)
        print("2. Check that tokens are being properly passed in Authorization header")
        print("3. Verify token format (JWT vs JWE)")

if __name__ == "__main__":
    check_auth0_config()