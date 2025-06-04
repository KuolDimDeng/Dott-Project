#!/usr/bin/env python
"""
Debug script to check Auth0 configuration and test JWT validation
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
import logging

logger = logging.getLogger(__name__)

def debug_auth0_config():
    """Debug Auth0 configuration"""
    print("=" * 60)
    print("🔍 AUTH0 CONFIGURATION DEBUG")
    print("=" * 60)
    
    # Check environment variables
    print("\n📋 Environment Variables:")
    auth0_vars = [
        'AUTH0_DOMAIN',
        'AUTH0_ISSUER_DOMAIN', 
        'AUTH0_CUSTOM_DOMAIN',
        'AUTH0_CLIENT_ID',
        'AUTH0_CLIENT_SECRET',
        'AUTH0_AUDIENCE',
        'AUTH0_ALGORITHMS'
    ]
    
    for var in auth0_vars:
        value = os.getenv(var, 'NOT_SET')
        if 'SECRET' in var and value != 'NOT_SET':
            value = f"{value[:10]}...{value[-10:]}" if len(value) > 20 else value[:20] + "..."
        print(f"   {var}: {value}")
    
    # Check Django settings
    print("\n⚙️  Django Settings:")
    settings_attrs = [
        'AUTH0_DOMAIN',
        'AUTH0_ISSUER_DOMAIN',
        'AUTH0_CUSTOM_DOMAIN', 
        'AUTH0_CLIENT_ID',
        'AUTH0_CLIENT_SECRET',
        'AUTH0_AUDIENCE',
        'AUTH0_ISSUER'
    ]
    
    for attr in settings_attrs:
        value = getattr(settings, attr, 'NOT_SET')
        if 'SECRET' in attr and value != 'NOT_SET':
            value = f"{value[:10]}...{value[-10:]}" if len(value) > 20 else value[:20] + "..."
        print(f"   {attr}: {value}")
    
    # Test Auth0 authentication module
    print("\n🔧 Auth0 Module Test:")
    try:
        from custom_auth.auth0_authentication import Auth0JWTAuthentication
        auth = Auth0JWTAuthentication()
        print(f"   ✅ Auth0JWTAuthentication module loaded successfully")
        print(f"   🔗 JWKS URL: {auth.jwks_url}")
        print(f"   🔹 Domain: {auth.domain}")
        print(f"   🔹 Issuer Domain: {auth.issuer_domain}")
        print(f"   🔹 Audience: {auth.audience}")
    except Exception as e:
        print(f"   ❌ Error loading Auth0JWTAuthentication: {e}")
    
    # Test middleware
    print("\n🛡️  Middleware Test:")
    try:
        from custom_auth.enhanced_rls_middleware import EnhancedRowLevelSecurityMiddleware, AUTH0_AVAILABLE
        print(f"   ✅ Enhanced RLS Middleware loaded successfully")
        print(f"   🔹 AUTH0_AVAILABLE: {AUTH0_AVAILABLE}")
    except Exception as e:
        print(f"   ❌ Error loading middleware: {e}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    debug_auth0_config() 