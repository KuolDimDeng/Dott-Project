#!/usr/bin/env python
"""
Script to remove kuoldimdeng@outlook.com from the production database
Run this on the production server
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction

def remove_user():
    User = get_user_model()
    email = "kuoldimdeng@outlook.com"
    
    print(f"Checking for user: {email}")
    print("=" * 50)
    
    try:
        with transaction.atomic():
            user = User.objects.filter(email=email).first()
            
            if user:
                print(f"⚠️ USER FOUND: {email}")
                print(f"  - User ID: {user.id}")
                print(f"  - Username: {user.username}")
                print(f"  - Date joined: {user.date_joined}")
                print(f"  - Is active: {user.is_active}")
                print(f"  - Is staff: {user.is_staff}")
                print(f"  - Tenant ID: {getattr(user, 'tenant_id', 'None')}")
                
                # Count related records
                from users.models import UserProfile
                has_profile = UserProfile.objects.filter(user=user).exists()
                print(f"  - Has UserProfile: {has_profile}")
                
                # Delete the user
                print("\n🗑️ Deleting user...")
                user.delete()
                print(f"✅ SUCCESS: User {email} has been deleted from the database")
                
            else:
                print(f"✅ GOOD NEWS: User {email} DOES NOT EXIST in the database")
                print("No action needed - this email is not registered in your app")
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = remove_user()
    if success:
        print("\n✅ Script completed successfully")
    else:
        print("\n❌ Script failed - please check the error above")