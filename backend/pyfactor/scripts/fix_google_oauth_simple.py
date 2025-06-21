#!/usr/bin/env python
"""
Simple fix for Google OAuth user onboarding status
Updates UserSession records to mark onboarding as complete

Usage:
    python manage.py shell < scripts/fix_google_oauth_simple.py
"""

import os
import sys
import django

# Set up Django environment
sys.path.append('/app')  # Render deployment path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dott_project.settings')
django.setup()

from custom_auth.models import User
from session_manager.models import UserSession

print("=" * 70)
print("🔧 FIXING GOOGLE OAUTH USER SESSION STATUS")
print("=" * 70)

email = "jubacargovillage@gmail.com"

try:
    user = User.objects.get(email=email)
    print(f"\n✅ Found user: {email}")
    print(f"   - User ID: {user.id}")
    print(f"   - Has tenant: {user.tenant is not None}")
    if user.tenant:
        print(f"   - Tenant: {user.tenant.name}")
    
    # Update all user sessions
    sessions = UserSession.objects.filter(user=user)
    print(f"\n📋 Found {sessions.count()} sessions for user")
    
    updated = sessions.filter(needs_onboarding=True).update(
        needs_onboarding=False,
        onboarding_completed=True
    )
    
    if updated > 0:
        print(f"✅ Updated {updated} sessions to mark onboarding as complete")
    else:
        print("✅ All sessions already have correct onboarding status")
    
    # Show current session status
    for session in sessions.filter(is_active=True)[:3]:  # Show up to 3 active sessions
        print(f"\n   Session {session.session_id}:")
        print(f"   - needs_onboarding: {session.needs_onboarding}")
        print(f"   - onboarding_completed: {session.onboarding_completed}")
        print(f"   - created: {session.created_at}")
        
except User.DoesNotExist:
    print(f"\n❌ User {email} not found")
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("✅ Done. User should now be able to log in without being redirected to onboarding.")
print("=" * 70)