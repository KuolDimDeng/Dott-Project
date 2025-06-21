#!/usr/bin/env python
"""
Check and fix onboarding status for a specific user
Usage: python check_user_onboarding.py <user_email>
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from django.contrib.auth import get_user_model
from onboarding.models import OnboardingProgress
from custom_auth.models import Tenant
from django.utils import timezone

User = get_user_model()

def check_user_onboarding(email):
    """Check and optionally fix onboarding status for a specific user"""
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        print(f"❌ User with email '{email}' not found")
        return
    
    print(f"\n📧 User: {user.email}")
    print(f"🆔 User ID: {user.id}")
    print(f"✅ Onboarding Completed: {user.onboarding_completed}")
    print(f"📅 Completed At: {user.onboarding_completed_at}")
    
    # Check tenant
    tenant = None
    if hasattr(user, 'tenant') and user.tenant:
        tenant = user.tenant
    else:
        # Try to find by owner_id
        user_id_str = str(user.id)
        tenant = Tenant.objects.filter(owner_id=user_id_str).first()
    
    print(f"\n🏢 Tenant:")
    if tenant:
        print(f"  - ID: {tenant.id}")
        print(f"  - Name: {tenant.name}")
    else:
        print(f"  - No tenant found")
    
    # Check OnboardingProgress
    progress = OnboardingProgress.objects.filter(user=user).first()
    
    print(f"\n📊 OnboardingProgress:")
    if progress:
        print(f"  - ID: {progress.id}")
        print(f"  - Status: {progress.onboarding_status}")
        print(f"  - Current Step: {progress.current_step}")
        print(f"  - Setup Completed: {progress.setup_completed}")
        print(f"  - Completed Steps: {progress.completed_steps}")
        print(f"  - Tenant ID: {progress.tenant_id}")
        print(f"  - Created: {progress.created_at}")
        print(f"  - Completed: {progress.completed_at}")
        
        # Check if should be complete
        should_be_complete = (
            progress.onboarding_status == 'complete' or 
            progress.setup_completed or
            (progress.completed_steps and 'complete' in progress.completed_steps)
        )
        
        print(f"\n🔍 Analysis:")
        print(f"  - Should be complete (per OnboardingProgress): {should_be_complete}")
        print(f"  - User.onboarding_completed: {user.onboarding_completed}")
        
        if should_be_complete != user.onboarding_completed:
            print(f"\n⚠️  Mismatch detected!")
            response = input("Fix this mismatch? (y/n): ")
            if response.lower() == 'y':
                user.onboarding_completed = should_be_complete
                if should_be_complete and not user.onboarding_completed_at:
                    user.onboarding_completed_at = progress.completed_at or timezone.now()
                elif not should_be_complete:
                    user.onboarding_completed_at = None
                user.save(update_fields=['onboarding_completed', 'onboarding_completed_at'])
                print(f"✅ Updated user.onboarding_completed to {should_be_complete}")
        else:
            print(f"\n✅ Status is correctly synced")
    else:
        print(f"  - No OnboardingProgress record found")
        
        if user.onboarding_completed:
            print(f"\n⚠️  User marked as completed but no OnboardingProgress!")
            response = input("Set onboarding_completed to False? (y/n): ")
            if response.lower() == 'y':
                user.onboarding_completed = False
                user.onboarding_completed_at = None
                user.save(update_fields=['onboarding_completed', 'onboarding_completed_at'])
                print(f"✅ Updated user.onboarding_completed to False")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python check_user_onboarding.py <user_email>")
        sys.exit(1)
    
    email = sys.argv[1]
    check_user_onboarding(email)