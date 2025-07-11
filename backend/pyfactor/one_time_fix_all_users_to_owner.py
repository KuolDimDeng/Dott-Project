#!/usr/bin/env python
"""
One-time script to update all existing users to OWNER role
This fixes users who were created with the old default of 'USER'
Run this ONCE in production after deployment
"""
import os
import sys
import django

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User

def fix_user_roles():
    # First, show what we're about to change
    user_role_users = User.objects.filter(role='USER')
    no_role_users = User.objects.filter(role__isnull=True)
    
    print(f"Found {user_role_users.count()} users with role='USER'")
    print(f"Found {no_role_users.count()} users with no role set")
    
    if user_role_users.exists():
        print("\nUsers with role='USER':")
        for user in user_role_users[:10]:  # Show first 10
            print(f"  - {user.email} (joined: {user.date_joined})")
        if user_role_users.count() > 10:
            print(f"  ... and {user_role_users.count() - 10} more")
    
    # Ask for confirmation
    total_to_update = user_role_users.count() + no_role_users.count()
    if total_to_update == 0:
        print("\nNo users need updating!")
        return
    
    response = input(f"\nUpdate {total_to_update} users to OWNER role? (yes/no): ")
    if response.lower() != 'yes':
        print("Aborted.")
        return
    
    # Update all users with 'USER' role to 'OWNER'
    updated_count = User.objects.filter(role='USER').update(role='OWNER')
    print(f"\nUpdated {updated_count} users from role='USER' to role='OWNER'")
    
    # Update all users with no role to 'OWNER'
    updated_null_count = User.objects.filter(role__isnull=True).update(role='OWNER')
    print(f"Updated {updated_null_count} users from role=NULL to role='OWNER'")
    
    # Show final statistics
    print("\nFinal role distribution:")
    from django.db.models import Count
    role_stats = User.objects.values('role').annotate(count=Count('id')).order_by('role')
    for stat in role_stats:
        print(f"  {stat['role'] or 'NULL'}: {stat['count']} users")
    
    print("\nDone!")

if __name__ == '__main__':
    fix_user_roles()