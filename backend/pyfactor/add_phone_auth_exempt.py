#!/usr/bin/env python
"""
Script to add phone auth endpoints to TENANT_EXEMPT_PATHS.
Run this in Render shell to update the settings.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings

print("=" * 60)
print("🔧 Adding Phone Auth to TENANT_EXEMPT_PATHS")
print("=" * 60)

# Current exempt paths
current_exempt = list(getattr(settings, 'TENANT_EXEMPT_PATHS', []))
print(f"\n📋 Current TENANT_EXEMPT_PATHS ({len(current_exempt)} paths):")
for path in current_exempt[:10]:  # Show first 10
    print(f"   - {path}")
if len(current_exempt) > 10:
    print(f"   ... and {len(current_exempt) - 10} more")

# Phone auth paths to add
phone_auth_paths = [
    '/api/auth/phone/',
    '/api/auth/phone/send-otp/',
    '/api/auth/phone/verify-otp/',
    '/api/auth/phone/status/',
]

print(f"\n➕ Phone auth paths to add:")
for path in phone_auth_paths:
    print(f"   - {path}")

# Check if already present
already_present = [p for p in phone_auth_paths if p in current_exempt]
if already_present:
    print(f"\n✅ Already in TENANT_EXEMPT_PATHS:")
    for path in already_present:
        print(f"   - {path}")
else:
    print(f"\n❌ Phone auth paths NOT in TENANT_EXEMPT_PATHS")
    print("   These need to be added to settings.py")

print("\n" + "=" * 60)
print("📝 Add these lines to pyfactor/settings.py:")
print("=" * 60)
print("""
# In the TENANT_EXEMPT_PATHS list, add:
    '/api/auth/phone/',
    '/api/auth/phone/send-otp/',
    '/api/auth/phone/verify-otp/',
    '/api/auth/phone/status/',
""")

print("\n⚠️  IMPORTANT: After adding to settings.py, restart the server!")
print("   On Render: The server will auto-restart after deploy")
print("=" * 60)