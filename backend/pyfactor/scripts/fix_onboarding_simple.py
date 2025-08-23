#!/usr/bin/env python
"""
Simple fix for all users with onboarding issues
Just run: python scripts/fix_onboarding_simple.py
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

def fix_all_incomplete_users():
    """Fix all users who have incomplete onboarding"""
    
    print("\n" + "="*60)
    print("FIXING ALL INCOMPLETE ONBOARDING USERS")
    print("="*60)
    
    # Find all users with incomplete onboarding
    incomplete_users = User.objects.filter(onboarding_completed=False)
    
    print(f"\nFound {incomplete_users.count()} users with incomplete onboarding")
    
    fixed_count = 0
    
    for user in incomplete_users:
        try:
            # Check if they have a UserProfile with tenant/business
            profile = UserProfile.objects.filter(user=user).first()
            
            if profile and (profile.tenant_id or profile.business_id):
                print(f"\n🔧 Fixing {user.email}...")
                
                # They have tenant/business, so mark as complete
                user.onboarding_completed = True
                user.onboarding_completed_at = timezone.now()
                if not user.user_subscription:
                    user.user_subscription = 'professional'
                user.save()
                
                # Update or create OnboardingProgress
                progress, created = OnboardingProgress.objects.get_or_create(
                    user=user,
                    defaults={
                        'onboarding_status': 'complete',
                        'setup_completed': True,
                        'current_step': 'completed',
                        'completed_steps': ['business_info', 'subscription', 'payment', 'setup'],
                        'selected_plan': 'professional',
                        'payment_completed': True,
                        'completed_at': timezone.now()
                    }
                )
                
                if not created and progress.onboarding_status != 'complete':
                    progress.onboarding_status = 'complete'
                    progress.setup_completed = True
                    progress.current_step = 'completed'
                    progress.completed_steps = ['business_info', 'subscription', 'payment', 'setup']
                    progress.payment_completed = True
                    progress.completed_at = timezone.now()
                    progress.save()
                
                print(f"  ✅ Fixed successfully")
                fixed_count += 1
                
            else:
                # Check if they have OnboardingProgress that's complete
                progress = OnboardingProgress.objects.filter(
                    user=user,
                    onboarding_status='complete'
                ).first()
                
                if progress:
                    print(f"\n🔧 Fixing {user.email} (has complete progress)...")
                    user.onboarding_completed = True
                    user.onboarding_completed_at = timezone.now()
                    if not user.user_subscription:
                        user.user_subscription = 'professional'
                    user.save()
                    print(f"  ✅ Fixed successfully")
                    fixed_count += 1
                
        except Exception as e:
            print(f"  ❌ Error fixing {user.email}: {str(e)}")
    
    print("\n" + "="*60)
    print(f"SUMMARY: Fixed {fixed_count} users")
    print("="*60)
    
    # Show final stats
    total_users = User.objects.count()
    completed_users = User.objects.filter(onboarding_completed=True).count()
    incomplete_users = User.objects.filter(onboarding_completed=False).count()
    
    print(f"\nFinal Statistics:")
    print(f"  Total users: {total_users}")
    print(f"  Completed onboarding: {completed_users}")
    print(f"  Incomplete onboarding: {incomplete_users}")
    
    if incomplete_users > 0:
        print(f"\n⚠️  Still {incomplete_users} users with incomplete onboarding")
        print("These are likely new users who haven't started onboarding yet")

if __name__ == "__main__":
    fix_all_incomplete_users()