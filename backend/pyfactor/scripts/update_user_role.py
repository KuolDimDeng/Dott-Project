#!/usr/bin/env python
"""
Script to update a user's role
Usage: python manage.py shell < scripts/update_user_role.py
"""

from django.contrib.auth import get_user_model

User = get_user_model()

# User to update
USER_EMAIL = 'support@dottapps.com'
NEW_ROLE = 'OWNER'  # Options: OWNER, ADMIN, USER

print("🎯 === UPDATE USER ROLE ===")

try:
    # Find the user
    user = User.objects.filter(email=USER_EMAIL).first()
    
    if not user:
        print(f"❌ User with email '{USER_EMAIL}' not found")
    else:
        old_role = getattr(user, 'role', 'USER')
        print(f"\n📋 Found user:")
        print(f"   Email: {user.email}")
        print(f"   Name: {user.get_full_name() if hasattr(user, 'get_full_name') else 'N/A'}")
        print(f"   Current role: {old_role}")
        print(f"   Active: {user.is_active}")
        
        # Update role
        user.role = NEW_ROLE
        user.save()
        
        print(f"\n✅ Role updated successfully!")
        print(f"   Old role: {old_role}")
        print(f"   New role: {user.role}")
        
        # Check if user has onboarding completed
        if hasattr(user, 'onboarding_completed'):
            print(f"   Onboarding completed: {user.onboarding_completed}")
        
        print(f"\n🚀 User {USER_EMAIL} now has {NEW_ROLE} permissions")
        
except Exception as e:
    print(f"\n❌ Error updating user role: {e}")
    import traceback
    traceback.print_exc()