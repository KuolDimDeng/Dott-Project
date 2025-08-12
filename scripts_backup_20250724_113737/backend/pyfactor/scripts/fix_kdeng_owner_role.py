#!/usr/bin/env python
"""
Script to fix kdeng@dottapps.com role to OWNER and ensure it's properly set in session data
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

try:
    django.setup()
    print("Django setup successful")
except Exception as e:
    print(f"Django setup failed: {str(e)}")
    sys.exit(1)

from django.db import transaction
from custom_auth.models import User, Tenant
from session_manager.models import UserSession

def fix_owner_role():
    """Fix kdeng@dottapps.com role to OWNER"""
    try:
        # Find the user
        user = User.objects.filter(email='kdeng@dottapps.com').first()
        
        if not user:
            print("User kdeng@dottapps.com not found!")
            return
        
        print(f"\nFound user: {user.email}")
        print(f"Current role: {user.role}")
        print(f"User ID: {user.id}")
        
        # Check if user owns a tenant
        tenant = Tenant.objects.filter(owner_id=str(user.id)).first()
        if tenant:
            print(f"User owns tenant: {tenant.name} (ID: {tenant.id})")
        else:
            print("User does not own any tenant")
        
        # Update role to OWNER
        if user.role != 'OWNER':
            with transaction.atomic():
                user.role = 'OWNER'
                user.save(update_fields=['role'])
                print(f"\n✅ Updated user role from '{user.role}' to 'OWNER'")
        else:
            print(f"\n✅ User already has OWNER role")
        
        # Check and update any active sessions
        active_sessions = UserSession.objects.filter(user=user, is_active=True)
        print(f"\nFound {active_sessions.count()} active sessions")
        
        for session in active_sessions:
            print(f"Session ID: {session.session_key}")
            if session.user_data:
                # Update role in session data
                session.user_data['role'] = 'OWNER'
                session.save(update_fields=['user_data'])
                print(f"  ✅ Updated session role to OWNER")
        
        print("\n✅ Role fix completed successfully!")
        
        # Display final state
        user.refresh_from_db()
        print(f"\nFinal state:")
        print(f"  Email: {user.email}")
        print(f"  Role: {user.role}")
        print(f"  Onboarding completed: {user.onboarding_completed}")
        print(f"  Subscription plan: {user.subscription_plan}")
        
    except Exception as e:
        print(f"\n❌ Error fixing role: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=== Fixing kdeng@dottapps.com OWNER role ===")
    fix_owner_role()