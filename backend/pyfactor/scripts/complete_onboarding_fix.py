#!/usr/bin/env python
"""
Complete fix for users stuck in onboarding loop.
This script:
1. Fixes UserProfile.tenant_id if missing
2. Marks User.onboarding_completed = True
3. Creates/updates OnboardingProgress to complete status
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from users.models import UserProfile
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress

User = get_user_model()

def complete_onboarding_fix(email):
    """Complete fix for user stuck in onboarding loop"""
    
    try:
        user = User.objects.get(email=email)
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        print(f"\n{'='*60}")
        print(f"COMPLETE ONBOARDING FIX: {email}")
        print(f"{'='*60}")
        
        # Current status
        print(f"\n📊 Current Status:")
        print(f"  - User.onboarding_completed: {user.onboarding_completed}")
        print(f"  - UserProfile.tenant_id: {profile.tenant_id}")
        print(f"  - UserProfile.business_id: {profile.business_id}")
        
        # Check if user owns any tenants
        owned_tenants = Tenant.objects.filter(owner_id=user.id)
        if owned_tenants.exists():
            tenant = owned_tenants.first()
            print(f"\n✅ User owns tenant: {tenant.id} - {tenant.name}")
            
            # Fix 1: Ensure UserProfile has tenant_id
            if not profile.tenant_id:
                profile.tenant_id = tenant.id
                profile.save()
                print(f"  ✅ Fixed UserProfile.tenant_id")
            
            # Fix 2: Mark onboarding as complete
            if not user.onboarding_completed:
                user.onboarding_completed = True
                user.onboarding_completed_at = timezone.now()
                if not hasattr(user, 'user_subscription') or not user.user_subscription:
                    user.user_subscription = 'professional'
                user.save()
                print(f"  ✅ Marked User.onboarding_completed = True")
            
            # Fix 3: Create/update OnboardingProgress
            progress, created = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'onboarding_status': 'complete',
                    'setup_completed': True,
                    'current_step': 'completed',
                    'completed_steps': ['business_info', 'subscription', 'payment', 'setup'],
                    'selected_plan': user.user_subscription or 'professional',
                    'payment_completed': True,
                    'completed_at': timezone.now()
                }
            )
            
            if not created:
                progress.onboarding_status = 'complete'
                progress.setup_completed = True
                progress.current_step = 'completed'
                progress.completed_steps = ['business_info', 'subscription', 'payment', 'setup']
                progress.payment_completed = True
                progress.completed_at = timezone.now()
                progress.save()
                print(f"  ✅ Updated OnboardingProgress to complete")
            else:
                print(f"  ✅ Created OnboardingProgress as complete")
            
            print(f"\n✅ Fix complete! User can now access dashboard.")
            print(f"\n📋 Final Status:")
            print(f"  - User.onboarding_completed: True")
            print(f"  - UserProfile.tenant_id: {profile.tenant_id}")
            print(f"  - OnboardingProgress.status: complete")
            
            return True
            
        else:
            print(f"\n❌ User doesn't own any tenants - cannot auto-complete onboarding")
            print(f"User needs to complete onboarding normally")
            return False
            
    except User.DoesNotExist:
        print(f"❌ User not found: {email}")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Complete fix for onboarding loop')
    parser.add_argument('--email', required=True, help='User email to fix')
    
    args = parser.parse_args()
    
    complete_onboarding_fix(args.email)

if __name__ == "__main__":
    main()