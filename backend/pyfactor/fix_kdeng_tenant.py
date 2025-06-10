#!/usr/bin/env python
"""
Emergency script to fix kdeng@dottapps.com tenant ID issue
Run this directly: python fix_kdeng_tenant.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant
from onboarding.models import OnboardingProgress
import uuid

def fix_kdeng_tenant():
    """Fix the invalid tenant_id for kdeng@dottapps.com"""
    try:
        # Find the user
        user = User.objects.get(email='kdeng@dottapps.com')
        print(f"Found user: {user.email} (ID: {user.id})")
        
        # Check current tenant
        if hasattr(user, 'tenant') and user.tenant:
            print(f"User already has tenant: {user.tenant.id} - {user.tenant.name}")
            tenant = user.tenant
        else:
            # Find or create tenant
            tenant = Tenant.objects.filter(owner_id=user.id).first()
            if tenant:
                print(f"Found existing tenant: {tenant.id} - {tenant.name}")
                # Update user.tenant
                user.tenant = tenant
                user.save(update_fields=['tenant'])
                print("Updated user.tenant relationship")
            else:
                # Create new tenant
                tenant = Tenant.objects.create(
                    name=f"{user.email.split('@')[0]}'s Business",
                    owner_id=user.id,
                    is_active=True,
                    rls_enabled=True,
                    setup_status='active'
                )
                print(f"Created new tenant: {tenant.id} - {tenant.name}")
                user.tenant = tenant
                user.save(update_fields=['tenant'])
                print("Set user.tenant relationship")
        
        # Fix OnboardingProgress
        try:
            progress = OnboardingProgress.objects.get(user=user)
            print(f"\nFound OnboardingProgress: {progress.id}")
            print(f"Current tenant_id: {progress.tenant_id}")
            print(f"Onboarding status: {progress.onboarding_status}")
            print(f"Setup completed: {progress.setup_completed}")
            
            # Update tenant_id
            old_tenant_id = progress.tenant_id
            progress.tenant_id = tenant.id
            progress.save(update_fields=['tenant_id'])
            
            print(f"\n✅ Fixed tenant_id: {old_tenant_id} -> {tenant.id}")
            
            # Verify the fix
            progress.refresh_from_db()
            print(f"\nVerification:")
            print(f"Progress tenant_id: {progress.tenant_id}")
            print(f"User tenant: {user.tenant.id if user.tenant else 'None'}")
            print(f"Match: {'✅ Yes' if str(progress.tenant_id) == str(tenant.id) else '❌ No'}")
            
        except OnboardingProgress.DoesNotExist:
            print("❌ No OnboardingProgress found for user")
            
    except User.DoesNotExist:
        print("❌ User kdeng@dottapps.com not found")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Fixing tenant ID for kdeng@dottapps.com...")
    fix_kdeng_tenant()
    print("\nDone!")