#!/usr/bin/env python
"""
Script to restore the user account with correct tenant and onboarding data
This will create the missing records in the Render PostgreSQL database
"""

import os
import sys
import django
from datetime import datetime
import uuid

# Setup Django
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from django.utils import timezone
from django.db import transaction

User = get_user_model()

def restore_user_account():
    """Restore the user account with original tenant ID and completed onboarding"""
    
    print("🔧 RESTORING USER ACCOUNT")
    print("=" * 50)
    
    # Target data
    email = "jubacargovillage@gmail.com"
    original_tenant_id = "0e781e5d-139e-4036-9982-0469e8bcb9d2"
    auth0_sub = "google-oauth2|107454913649768153331"
    
    try:
        with transaction.atomic():
            print(f"1. Looking for existing user with email: {email}")
            
            # Find or create the user
            user, user_created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': 'Kuol',
                    'last_name': 'Deng',
                    'is_active': True,
                    'auth0_sub': auth0_sub,
                }
            )
            
            if user_created:
                print(f"✅ Created new user: {user.email} (ID: {user.pk})")
            else:
                print(f"✅ Found existing user: {user.email} (ID: {user.pk})")
                # Update Auth0 sub if missing
                if not getattr(user, 'auth0_sub', None):
                    setattr(user, 'auth0_sub', auth0_sub)
                    user.save()
                    print(f"   Updated Auth0 sub: {auth0_sub}")
            
            print(f"\n2. Checking for existing tenant: {original_tenant_id}")
            
            # Check if target tenant exists
            existing_tenant = Tenant.objects.filter(id=original_tenant_id).first()
            
            if existing_tenant:
                print(f"✅ Found existing tenant: {existing_tenant.id}")
                print(f"   Current owner ID: {existing_tenant.owner_id}")
                
                # Update ownership to current user if different
                if existing_tenant.owner_id != user.pk:
                    print(f"🔧 Updating tenant ownership from {existing_tenant.owner_id} to {user.pk}")
                    existing_tenant.owner_id = user.pk
                    existing_tenant.save(update_fields=['owner_id'])
                
                tenant = existing_tenant
            else:
                print(f"❌ Tenant not found, creating new one with original ID: {original_tenant_id}")
                
                # Create the tenant with original ID
                tenant = Tenant.objects.create(
                    id=original_tenant_id,
                    name="Kuol's Business",
                    owner_id=user.pk,
                    created_at=timezone.now(),
                    updated_at=timezone.now(),
                    is_active=True
                )
                print(f"✅ Created tenant: {tenant.id}")
            
            print(f"\n3. Setting up completed onboarding")
            
            # Create or update onboarding progress as complete
            progress, progress_created = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'tenant_id': tenant.id,
                    'onboarding_status': 'complete',
                    'current_step': 'complete',
                    'next_step': 'complete',
                    'setup_completed': True,
                    'payment_completed': True,
                    'completed_steps': ['business_info', 'subscription', 'payment', 'setup', 'complete'],
                    'completed_at': timezone.now(),
                    'selected_plan': 'free',
                    'subscription_plan': 'free',
                }
            )
            
            if progress_created:
                print(f"✅ Created completed onboarding progress")
            else:
                print(f"✅ Found existing onboarding progress")
                # Update to complete if not already
                if progress.onboarding_status != 'complete':
                    print(f"🔧 Updating onboarding status from '{progress.onboarding_status}' to 'complete'")
                    progress.onboarding_status = 'complete'
                    progress.current_step = 'complete'
                    progress.next_step = 'complete'
                    progress.setup_completed = True
                    progress.payment_completed = True
                    progress.completed_steps = ['business_info', 'subscription', 'payment', 'setup', 'complete']
                    progress.completed_at = timezone.now()
                    progress.selected_plan = 'free'
                    progress.subscription_plan = 'free'
                    progress.save()
            
            print(f"\n✅ ACCOUNT RESTORATION COMPLETE!")
            print(f"   User ID: {user.pk}")
            print(f"   Email: {user.email}")
            print(f"   Auth0 Sub: {getattr(user, 'auth0_sub', 'None')}")
            print(f"   Tenant ID: {tenant.id}")
            print(f"   Onboarding Status: {progress.onboarding_status}")
            print(f"   Should redirect to: Dashboard (onboarding complete)")
            
            return True
            
    except Exception as e:
        print(f"❌ Error restoring account: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    restore_user_account() 