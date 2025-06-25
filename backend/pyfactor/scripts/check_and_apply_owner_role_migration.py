#!/usr/bin/env python
"""
Script to check if the owner role migration has been applied and apply it if needed
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

def check_and_fix_owner_roles():
    """Check and fix owner roles for all tenants"""
    try:
        # Check if migration has been applied
        from django.db.migrations.recorder import MigrationRecorder
        migration_applied = MigrationRecorder.Migration.objects.filter(
            app='custom_auth',
            name='0004_set_first_user_as_owner'
        ).exists()
        
        print(f"\nMigration 0004_set_first_user_as_owner applied: {migration_applied}")
        
        # Get all tenants
        tenants = Tenant.objects.all()
        print(f"\nFound {tenants.count()} tenants")
        
        fixed_count = 0
        
        for tenant in tenants:
            print(f"\nChecking tenant: {tenant.name} (ID: {tenant.id})")
            
            # Find the owner by owner_id field
            if tenant.owner_id:
                try:
                    owner = User.objects.get(id=tenant.owner_id)
                    print(f"  Owner: {owner.email} (Role: {owner.role})")
                    
                    if owner.role != 'OWNER':
                        with transaction.atomic():
                            owner.role = 'OWNER'
                            owner.save(update_fields=['role'])
                            print(f"  ✅ Updated {owner.email} role to OWNER")
                            fixed_count += 1
                    else:
                        print(f"  ✅ {owner.email} already has OWNER role")
                        
                except User.DoesNotExist:
                    print(f"  ❌ Owner ID {tenant.owner_id} not found!")
            else:
                # Find first user for this tenant
                first_user = User.objects.filter(tenant=tenant).order_by('date_joined').first()
                if first_user:
                    print(f"  First user: {first_user.email} (Role: {first_user.role})")
                    
                    if first_user.role != 'OWNER':
                        with transaction.atomic():
                            first_user.role = 'OWNER'
                            first_user.save(update_fields=['role'])
                            
                            # Also update tenant owner_id
                            tenant.owner_id = str(first_user.id)
                            tenant.save(update_fields=['owner_id'])
                            
                            print(f"  ✅ Updated {first_user.email} role to OWNER and set as tenant owner")
                            fixed_count += 1
                    else:
                        print(f"  ✅ {first_user.email} already has OWNER role")
                else:
                    print(f"  ⚠️  No users found for this tenant")
        
        print(f"\n✅ Fixed {fixed_count} user roles")
        
        # Check specific user
        kdeng = User.objects.filter(email='kdeng@dottapps.com').first()
        if kdeng:
            print(f"\nkdeng@dottapps.com status:")
            print(f"  ID: {kdeng.id}")
            print(f"  Role: {kdeng.role}")
            print(f"  Tenant: {kdeng.tenant}")
            print(f"  Onboarding completed: {kdeng.onboarding_completed}")
            print(f"  Subscription plan: {kdeng.subscription_plan}")
        else:
            print(f"\nkdeng@dottapps.com not found")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=== Checking and fixing owner roles ===")
    check_and_fix_owner_roles()