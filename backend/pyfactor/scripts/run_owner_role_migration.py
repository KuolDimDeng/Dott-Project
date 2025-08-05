#!/usr/bin/env python
"""
Script to manually run the owner role migration
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

from django.db import transaction as db_transaction
from custom_auth.models import User, Tenant

def set_tenant_first_user_as_owner():
    """
    For each tenant, set the first user (by creation date) as OWNER.
    This is the same logic as migration 0004_set_first_user_as_owner.
    """
    print("\n=== Running Owner Role Migration ===")
    
    try:
        # For each tenant, find the first user and set them as OWNER
        tenants = Tenant.objects.all()
        print(f"Found {tenants.count()} tenants")
        
        updated_count = 0
        
        for tenant in tenants:
            print(f"\nProcessing tenant: {tenant.name} (ID: {tenant.id})")
            
            # Method 1: Check owner_id field first
            if tenant.owner_id:
                try:
                    owner = User.objects.get(id=tenant.owner_id)
                    if owner.role != 'OWNER':
                        with db_transaction.atomic():
                            owner.role = 'OWNER'
                            owner.save(update_fields=['role'])
                            print(f"  ✅ Updated owner {owner.email} role to OWNER")
                            updated_count += 1
                    else:
                        print(f"  ✓ Owner {owner.email} already has OWNER role")
                except User.DoesNotExist:
                    print(f"  ❌ Owner with ID {tenant.owner_id} not found")
            
            # Method 2: Find first user for this tenant
            first_user = User.objects.filter(tenant=tenant).order_by('date_joined').first()
            if first_user and first_user.role != 'OWNER':
                with db_transaction.atomic():
                    first_user.role = 'OWNER'
                    first_user.save(update_fields=['role'])
                    print(f"  ✅ Updated first user {first_user.email} role to OWNER")
                    updated_count += 1
            elif first_user:
                print(f"  ✓ First user {first_user.email} already has OWNER role")
        
        print(f"\n✅ Updated {updated_count} users to OWNER role")
        
        # Special check for kdeng@dottapps.com
        kdeng = User.objects.filter(email='kdeng@dottapps.com').first()
        if kdeng:
            print(f"\n=== kdeng@dottapps.com Status ===")
            print(f"ID: {kdeng.id}")
            print(f"Role: {kdeng.role}")
            print(f"Tenant: {kdeng.tenant}")
            print(f"Onboarding completed: {kdeng.onboarding_completed}")
            print(f"Subscription plan: {kdeng.subscription_plan}")
            
            if kdeng.role != 'OWNER':
                with db_transaction.atomic():
                    kdeng.role = 'OWNER'
                    kdeng.save(update_fields=['role'])
                    print(f"\n✅ Updated kdeng@dottapps.com role to OWNER")
                    
                    # Also ensure tenant owner_id is set
                    if kdeng.tenant and kdeng.tenant.owner_id != str(kdeng.id):
                        kdeng.tenant.owner_id = str(kdeng.id)
                        kdeng.tenant.save(update_fields=['owner_id'])
                        print(f"✅ Updated tenant owner_id to {kdeng.id}")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = set_tenant_first_user_as_owner()
    if success:
        print("\n✅ Migration completed successfully!")
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)