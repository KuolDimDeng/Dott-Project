#!/usr/bin/env python
"""
Safely delete a user and related data, handling missing tables

Usage:
    python manage.py shell < scripts/delete_user_safe.py
"""

import os
import sys
import django

# Set up Django environment
sys.path.append('/app')  # Render deployment path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dott_project.settings')
django.setup()

from django.db import transaction as db_transaction, connection
from custom_auth.models import User
from session_manager.models import UserSession
from onboarding.models import OnboardingProgress

email = "jubacargovillage@gmail.com"

print("=" * 70)
print(f"🗑️  SAFELY DELETING USER: {email}")
print("=" * 70)

try:
    user = User.objects.get(email=email)
    print(f"\n✅ Found user: {email}")
    print(f"   - User ID: {user.id}")
    print(f"   - Tenant: {user.tenant.name if user.tenant else 'None'}")
    
    with db_transaction.atomic():
        # Delete related objects manually to avoid missing table errors
        
        # Delete user sessions
        try:
            sessions_deleted = UserSession.objects.filter(user=user).delete()
            print(f"   - Deleted {sessions_deleted[0]} sessions")
        except Exception as e:
            print(f"   - No sessions to delete or error: {e}")
        
        # Delete onboarding progress
        try:
            onboarding_deleted = OnboardingProgress.objects.filter(user=user).delete()
            print(f"   - Deleted {onboarding_deleted[0]} onboarding records")
        except Exception as e:
            print(f"   - No onboarding records to delete or error: {e}")
        
        # Delete the user using raw SQL to avoid cascade issues
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM custom_auth_user WHERE id = %s",
                [user.id]
            )
            print(f"   - Deleted user record")
        
        print(f"\n✅ User {email} deleted successfully")
        print("\nUser can now sign up fresh and go through onboarding normally")
        
except User.DoesNotExist:
    print(f"\n❌ User {email} not found - may already be deleted")
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)