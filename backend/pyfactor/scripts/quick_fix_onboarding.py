#!/usr/bin/env python
"""
Quick fix for kuoldimdeng123@gmail.com onboarding issue
Run on server: python scripts/quick_fix_onboarding.py
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
from users.models import UserProfile
from onboarding.models import OnboardingProgress
from django.utils import timezone

User = get_user_model()

def fix_user_onboarding(email='kuoldimdeng123@gmail.com'):
    """Quick fix for specific user's onboarding status"""
    
    print(f"\n🔧 Fixing onboarding for: {email}")
    
    try:
        user = User.objects.get(email=email)
        print(f"✅ User found: {user.email}")
        
        # Check current status
        print(f"Current onboarding_completed: {user.onboarding_completed}")
        
        # Fix the User model
        user.onboarding_completed = True
        user.onboarding_completed_at = timezone.now()
        if not hasattr(user, 'user_subscription') or not user.user_subscription:
            user.user_subscription = 'professional'
        user.save()
        print(f"✅ Updated User.onboarding_completed = True")
        
        # Check/create UserProfile
        profile, created = UserProfile.objects.get_or_create(user=user)
        if created:
            print(f"✅ Created UserProfile")
        else:
            print(f"✅ UserProfile exists - Tenant ID: {profile.tenant_id}, Business ID: {profile.business_id}")
        
        # Fix OnboardingProgress
        try:
            onboarding = OnboardingProgress.objects.get(user=user)
            onboarding.onboarding_status = 'complete'
            onboarding.setup_completed = True
            onboarding.current_step = 'completed'
            onboarding.completed_steps = ['business_info', 'subscription', 'payment', 'setup']
            onboarding.payment_completed = True
            if not onboarding.selected_plan:
                onboarding.selected_plan = 'professional'
            onboarding.completed_at = timezone.now()
            onboarding.save()
            print(f"✅ Updated OnboardingProgress.onboarding_status = complete")
        except OnboardingProgress.DoesNotExist:
            OnboardingProgress.objects.create(
                user=user,
                onboarding_status='complete',
                setup_completed=True,
                current_step='completed',
                completed_steps=['business_info', 'subscription', 'payment', 'setup'],
                selected_plan='professional',
                payment_completed=True,
                completed_at=timezone.now()
            )
            print(f"✅ Created OnboardingProgress with status = complete")
        
        print(f"\n✅ Successfully fixed onboarding for {email}")
        print(f"   User can now access the dashboard")
        
        return True
        
    except User.DoesNotExist:
        print(f"❌ User not found: {email}")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Fix the specific user
    fix_user_onboarding('kuoldimdeng123@gmail.com')