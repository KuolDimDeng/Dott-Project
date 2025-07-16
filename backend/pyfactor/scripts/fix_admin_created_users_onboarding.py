#!/usr/bin/env python
"""
Fix onboarding status for users created by admin
These users should skip onboarding and go directly to dashboard
"""
import os
import sys
import django
from django.utils import timezone

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User
from django.db import transaction

def fix_admin_created_users():
    """Mark admin-created users as having completed onboarding"""
    print("\n" + "="*60)
    print("Fixing Onboarding Status for Admin-Created Users")
    print("="*60)
    
    # Find users who:
    # 1. Are not the tenant owner (role != 'OWNER')
    # 2. Have onboarding_completed = False
    # 3. Share the same tenant as another user (admin-created)
    
    admin_created_users = User.objects.filter(
        role__in=['ADMIN', 'USER'],
        onboarding_completed=False
    )
    
    print(f"\nFound {admin_created_users.count()} potential admin-created users needing fix")
    
    if admin_created_users.count() == 0:
        print("No users to fix!")
        return
    
    # Show the users that will be fixed
    print("\nUsers to be fixed:")
    for user in admin_created_users:
        print(f"  - {user.email} (Role: {user.role}, Tenant: {user.tenant.name if user.tenant else 'None'})")
    
    # Ask for confirmation
    confirm = input(f"\nMark these {admin_created_users.count()} users as having completed onboarding? (yes/no): ")
    
    if confirm.lower() != 'yes':
        print("Operation cancelled.")
        return
    
    # Fix the users
    try:
        with transaction.atomic():
            updated_count = 0
            for user in admin_created_users:
                user.onboarding_completed = True
                user.onboarding_completed_at = timezone.now()
                user.save()
                updated_count += 1
                print(f"✅ Fixed: {user.email}")
            
            print(f"\n✅ Successfully updated {updated_count} users")
    except Exception as e:
        print(f"\n❌ Error during update: {str(e)}")

def fix_specific_user(email):
    """Fix onboarding for a specific user"""
    try:
        user = User.objects.get(email__iexact=email)
        
        print(f"\nUser Details:")
        print(f"  Email: {user.email}")
        print(f"  Role: {user.role}")
        print(f"  Tenant: {user.tenant.name if user.tenant else 'None'}")
        print(f"  Onboarding Completed: {user.onboarding_completed}")
        print(f"  Created At: {user.created_at}")
        
        if user.onboarding_completed:
            print("\n✅ User has already completed onboarding!")
            return
        
        confirm = input(f"\nMark {email} as having completed onboarding? (yes/no): ")
        
        if confirm.lower() == 'yes':
            user.onboarding_completed = True
            user.onboarding_completed_at = timezone.now()
            user.save()
            print(f"\n✅ Successfully updated {email}")
        else:
            print("Operation cancelled.")
            
    except User.DoesNotExist:
        print(f"\n❌ User {email} not found")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Fix specific user
        email = sys.argv[1]
        fix_specific_user(email)
    else:
        # Fix all admin-created users
        fix_admin_created_users()