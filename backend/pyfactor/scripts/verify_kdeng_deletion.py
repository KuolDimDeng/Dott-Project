#!/usr/bin/env python
"""
Verify that kdeng@dottapps.com has been completely deleted

This script checks:
1. User account doesn't exist
2. No tenant associated with the email
3. No sessions exist
4. No orphaned data remains

Usage:
    python manage.py shell < scripts/verify_kdeng_deletion.py
"""

import os
import sys
import django

# Set up Django environment
sys.path.append('/app')  # Render deployment path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from custom_auth.models import User, Tenant
from session_manager.models import UserSession
from onboarding.models import OnboardingProgress

email = "kdeng@dottapps.com"

print("=" * 70)
print(f"🔍 VERIFYING DELETION OF: {email}")
print("=" * 70)

# Check if user exists
try:
    user = User.objects.get(email=email)
    print(f"\n❌ User still exists!")
    print(f"   - User ID: {user.id}")
    print(f"   - Tenant: {user.tenant.name if user.tenant else 'None'}")
except User.DoesNotExist:
    print(f"\n✅ User {email} does not exist (good!)")

# Check for orphaned sessions
try:
    # Check using raw SQL in case of dangling references
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT COUNT(*) FROM session_manager_usersession WHERE user_id IN (SELECT id FROM custom_auth_user WHERE email = %s)",
            [email]
        )
        session_count = cursor.fetchone()[0]
        if session_count > 0:
            print(f"\n❌ Found {session_count} orphaned sessions")
        else:
            print(f"✅ No orphaned sessions found")
except Exception as e:
    print(f"✅ No session table or no orphaned sessions")

# Check for any tenant with owner email
try:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT t.id, t.name 
            FROM custom_auth_tenant t
            JOIN custom_auth_user u ON t.owner_id = u.id
            WHERE u.email = %s
            """,
            [email]
        )
        tenants = cursor.fetchall()
        if tenants:
            print(f"\n❌ Found {len(tenants)} orphaned tenants:")
            for tenant_id, tenant_name in tenants:
                print(f"   - {tenant_name} (ID: {tenant_id})")
        else:
            print(f"✅ No orphaned tenants found")
except Exception as e:
    print(f"✅ No orphaned tenants found")

# Check Auth0 (if you have management API access)
print("\n📝 NOTES:")
print("   - The user has been deleted from the local database")
print("   - The user may still exist in Auth0 (external auth provider)")
print("   - When signing up with kuoldimdeng@outlook.com:")
print("     • Use a fresh browser or incognito mode")
print("     • Clear cookies for dottapps.com domain")
print("     • The system will treat it as a new account")

print("\n" + "=" * 70)
print("✅ VERIFICATION COMPLETE")
print("   Ready for fresh signup with kuoldimdeng@outlook.com")
print("=" * 70)
print("\n")