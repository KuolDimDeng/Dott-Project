#!/usr/bin/env python
"""
Fix user-tenant relationships for users who have completed onboarding
but don't have their user.tenant field set properly.

This script:
1. Finds all users who have onboarding progress marked as complete
2. Checks if they have a tenant where they are the owner
3. Updates the user.tenant field to point to that tenant
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from custom_auth.models import User, Tenant
from onboarding.models import OnboardingProgress


def fix_user_tenant_relationships():
    """Fix user-tenant relationships for all users."""
    print("Starting user-tenant relationship fix...")
    
    # Counter for statistics
    fixed_count = 0
    already_correct_count = 0
    no_tenant_count = 0
    
    # Get all users
    users = User.objects.all()
    total_users = users.count()
    print(f"Found {total_users} total users")
    
    with transaction.atomic():
        for user in users:
            # Skip if user already has tenant set correctly
            if user.tenant:
                # Verify the tenant is correct (user is owner)
                tenant_by_owner = Tenant.objects.filter(owner_id=user.id).first()
                if tenant_by_owner and user.tenant.id == tenant_by_owner.id:
                    already_correct_count += 1
                    continue
            
            # Find tenant where user is owner
            tenant = Tenant.objects.filter(owner_id=user.id).first()
            
            if tenant:
                # Update user.tenant field
                user.tenant = tenant
                user.save(update_fields=['tenant'])
                print(f"✅ Fixed user {user.email} - assigned tenant {tenant.id} ({tenant.name})")
                fixed_count += 1
            else:
                # Check if user has onboarding progress
                progress = OnboardingProgress.objects.filter(user=user).first()
                if progress and progress.tenant_id:
                    # User has onboarding progress with tenant_id but no tenant where they're owner
                    # This might be a data inconsistency
                    print(f"⚠️  User {user.email} has onboarding progress with tenant_id {progress.tenant_id} but no owned tenant")
                else:
                    print(f"❌ User {user.email} has no tenant")
                no_tenant_count += 1
    
    print("\n=== Summary ===")
    print(f"Total users: {total_users}")
    print(f"Fixed: {fixed_count}")
    print(f"Already correct: {already_correct_count}")
    print(f"No tenant found: {no_tenant_count}")
    
    # Additional check: Find tenants without proper user relationships
    print("\n=== Checking for orphaned tenants ===")
    tenants = Tenant.objects.all()
    orphaned_count = 0
    
    for tenant in tenants:
        if tenant.owner_id:
            # Check if owner exists
            try:
                owner = User.objects.get(id=tenant.owner_id)
                if not owner.tenant or owner.tenant.id != tenant.id:
                    print(f"⚠️  Tenant {tenant.id} ({tenant.name}) owner {owner.email} doesn't have correct tenant relationship")
                    orphaned_count += 1
            except User.DoesNotExist:
                print(f"❌ Tenant {tenant.id} ({tenant.name}) has non-existent owner_id: {tenant.owner_id}")
                orphaned_count += 1
        else:
            print(f"❌ Tenant {tenant.id} ({tenant.name}) has no owner_id")
            orphaned_count += 1
    
    print(f"\nFound {orphaned_count} tenants with relationship issues")


if __name__ == "__main__":
    fix_user_tenant_relationships()