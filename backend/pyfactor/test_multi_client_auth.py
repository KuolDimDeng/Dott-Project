#!/usr/bin/env python
"""
Test script to verify backend accepts tokens from multiple Auth0 client IDs
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.conf import settings

print("=" * 60)
print("Auth0 Multi-Client Configuration Test")
print("=" * 60)

print("\n📋 Current Configuration:")
print(f"   AUTH0_DOMAIN: {settings.AUTH0_DOMAIN}")
print(f"   AUTH0_CLIENT_ID: {settings.AUTH0_CLIENT_ID}")
print(f"   AUTH0_AUDIENCE: {settings.AUTH0_AUDIENCE}")

if hasattr(settings, 'AUTH0_ALLOWED_CLIENTS'):
    print(f"\n✅ AUTH0_ALLOWED_CLIENTS is configured:")
    for idx, client_id in enumerate(settings.AUTH0_ALLOWED_CLIENTS, 1):
        if client_id == '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF':
            print(f"   {idx}. {client_id} (Web App)")
        elif client_id == 'vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG':
            print(f"   {idx}. {client_id} (Native Mobile App)")
        else:
            print(f"   {idx}. {client_id}")
else:
    print("\n❌ AUTH0_ALLOWED_CLIENTS is NOT configured")
    print("   Backend will only accept tokens from the primary client ID")

print("\n🔍 Testing Auth0JWTAuthentication class:")
try:
    from custom_auth.auth0_authentication import Auth0JWTAuthentication
    auth = Auth0JWTAuthentication()
    
    print(f"   Allowed clients from auth class: {auth.allowed_clients}")
    
    if 'vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG' in auth.allowed_clients:
        print("\n✅ Mobile app client ID is allowed!")
    else:
        print("\n❌ Mobile app client ID is NOT allowed")
        
    if '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF' in auth.allowed_clients:
        print("✅ Web app client ID is allowed!")
    else:
        print("❌ Web app client ID is NOT allowed")
        
except Exception as e:
    print(f"\n❌ Error testing Auth0JWTAuthentication: {e}")

print("\n" + "=" * 60)
print("Configuration test complete!")
print("=" * 60)