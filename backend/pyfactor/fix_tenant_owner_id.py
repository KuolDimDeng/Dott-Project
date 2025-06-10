#!/usr/bin/env python
"""
Fix tenant owner_id type mismatches in the database
"""
import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress

User = get_user_model()

def fix_tenant_owner_ids():
    print("🔧 FIXING TENANT OWNER_ID TYPE MISMATCHES")
    print("=" * 50)
    
    # Find all tenants
    all_tenants = Tenant.objects.all()
    print(f"Total tenants in database: {all_tenants.count()}")
    
    fixed_count = 0
    
    for tenant in all_tenants:
        owner_id = tenant.owner_id
        
        # Check if owner_id looks like an integer stored as string
        try:
            # Try to convert to int - if successful, it's a numeric string
            int_value = int(owner_id)
            
            # Check if a user exists with this ID
            try:
                user = User.objects.get(id=int_value)
                print(f"\n📍 Tenant {tenant.id} ('{tenant.name}')")
                print(f"   Current owner_id: '{owner_id}' (looks like user ID {int_value})")
                print(f"   Found user: {user.email}")
                
                # Ensure it's stored as string (it should already be)
                if owner_id != str(int_value):
                    print(f"   ⚠️  Fixing format: '{owner_id}' -> '{str(int_value)}'")
                    tenant.owner_id = str(int_value)
                    tenant.save()
                    fixed_count += 1
                
                # Update user.tenant relationship if missing
                if not user.tenant or user.tenant.id != tenant.id:
                    print(f"   🔗 Updating user.tenant relationship")
                    user.tenant = tenant
                    user.save(update_fields=['tenant'])
                    
            except User.DoesNotExist:
                print(f"\n⚠️  Tenant {tenant.id} has owner_id '{owner_id}' but no user with ID {int_value} exists!")
                
        except ValueError:
            # owner_id is not numeric - might be a UUID or other format
            print(f"\n❓ Tenant {tenant.id} has non-numeric owner_id: '{owner_id}'")
    
    print(f"\n✅ Fixed {fixed_count} tenants")
    
    # Special check for kdeng@dottapps.com
    print("\n" + "=" * 50)
    print("🔍 CHECKING kdeng@dottapps.com SPECIFICALLY")
    print("=" * 50)
    
    try:
        user = User.objects.get(email="kdeng@dottapps.com")
        print(f"User found: ID={user.id}, tenant={user.tenant}")
        
        # Check for tenant by string ID
        user_id_str = str(user.id)
        tenant = Tenant.objects.filter(owner_id=user_id_str).first()
        
        if tenant:
            print(f"✅ Tenant found for user: {tenant.id} ('{tenant.name}')")
        else:
            print(f"❌ NO TENANT FOUND for user ID '{user_id_str}'")
            
            # Check if there's a tenant with integer owner_id
            tenant_by_int = Tenant.objects.filter(owner_id=user.id).first()
            if tenant_by_int:
                print(f"⚠️  Found tenant with integer owner_id: {tenant_by_int.id}")
                print(f"   Fixing: owner_id={user.id} -> owner_id='{user_id_str}'")
                tenant_by_int.owner_id = user_id_str
                tenant_by_int.save()
                
                # Update user.tenant
                user.tenant = tenant_by_int
                user.save(update_fields=['tenant'])
                print("✅ Fixed!")
            else:
                print("🚨 NO TENANT EXISTS - Creating one now...")
                tenant = Tenant.objects.create(
                    name=f"{user.email.split('@')[0]}'s Business",
                    owner_id=user_id_str,
                    subscription_tier='trial'
                )
                user.tenant = tenant
                user.save(update_fields=['tenant'])
                print(f"✅ Created tenant: {tenant.id}")
                
        # Check onboarding progress
        progress = OnboardingProgress.objects.filter(user=user).first()
        if progress:
            print(f"\nOnboarding Progress:")
            print(f"  - Status: {progress.onboarding_status}")
            print(f"  - Tenant ID: {progress.tenant_id}")
            print(f"  - Setup completed: {progress.setup_completed}")
            
            if progress.tenant_id != tenant.id:
                print(f"  ⚠️  Fixing progress tenant_id: {progress.tenant_id} -> {tenant.id}")
                progress.tenant_id = tenant.id
                progress.save()
                
    except User.DoesNotExist:
        print("❌ User kdeng@dottapps.com not found!")

if __name__ == "__main__":
    fix_tenant_owner_ids()