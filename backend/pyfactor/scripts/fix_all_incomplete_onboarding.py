#!/usr/bin/env python3
"""
Fix onboarding status for all users who have completed payment but are stuck in 'setup' status
"""

import os
import sys
import django
from django.utils import timezone
from django.db import transaction

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession


def fix_incomplete_onboarding():
    """Fix all users with incomplete onboarding status despite payment completion"""
    
    print("\n=== Fixing incomplete onboarding for paid users ===\n")
    
    # Find all users with paid plans but incomplete onboarding
    incomplete_users = OnboardingProgress.objects.filter(
        subscription_plan__in=['professional', 'enterprise'],
        payment_completed=True,
        onboarding_status__in=['setup', 'payment', 'subscription']  # Not 'complete'
    )
    
    print(f"Found {incomplete_users.count()} users with incomplete onboarding despite payment")
    
    fixed_count = 0
    for progress in incomplete_users:
        try:
            user = progress.user
            print(f"\n📋 Processing user: {user.email}")
            print(f"   - Current status: {progress.onboarding_status}")
            print(f"   - Subscription: {progress.subscription_plan}")
            print(f"   - Payment completed: {progress.payment_completed}")
            
            with transaction.atomic():
                # Update onboarding status
                progress.onboarding_status = 'complete'
                progress.current_step = 'complete'
                progress.setup_completed = True
                progress.setup_timestamp = progress.setup_timestamp or timezone.now()
                progress.completed_at = progress.completed_at or timezone.now()
                
                # Ensure all steps are marked as completed
                if progress.completed_steps is None:
                    progress.completed_steps = []
                
                required_steps = ['business_info', 'subscription', 'payment', 'setup', 'complete']
                for step in required_steps:
                    if step not in progress.completed_steps:
                        progress.completed_steps.append(step)
                
                # Save the changes
                progress.save()
                
                # Clear any active sessions to force fresh login
                active_sessions = UserSession.objects.filter(
                    user=user,
                    expires_at__gt=timezone.now()
                ).delete()
                
                print(f"   ✅ Fixed onboarding status to 'complete'")
                print(f"   ✅ Setup marked as completed")
                print(f"   ✅ Cleared active sessions")
                fixed_count += 1
                
        except Exception as e:
            print(f"   ❌ Error fixing user {user.email}: {str(e)}")
            continue
    
    print(f"\n✅ Successfully fixed {fixed_count} users")
    
    # List specific users that were fixed
    if fixed_count > 0:
        print("\nFixed users:")
        for progress in OnboardingProgress.objects.filter(
            subscription_plan__in=['professional', 'enterprise'],
            payment_completed=True,
            onboarding_status='complete',
            setup_completed=True
        ).order_by('-updated_at')[:fixed_count]:
            print(f"   - {progress.user.email} ({progress.subscription_plan})")


def check_specific_user(email):
    """Check specific user's onboarding status"""
    try:
        user = User.objects.get(email=email)
        progress = OnboardingProgress.objects.get(user=user)
        
        print(f"\n📊 Status for {email}:")
        print(f"   - Onboarding status: {progress.onboarding_status}")
        print(f"   - Current step: {progress.current_step}")
        print(f"   - Setup completed: {progress.setup_completed}")
        print(f"   - Payment completed: {progress.payment_completed}")
        print(f"   - Subscription plan: {progress.subscription_plan}")
        print(f"   - Completed steps: {progress.completed_steps}")
        
        if progress.onboarding_status != 'complete' and progress.payment_completed and progress.subscription_plan in ['professional', 'enterprise']:
            print("   ⚠️  This user needs fixing!")
            
    except User.DoesNotExist:
        print(f"\n❌ User {email} not found")
    except OnboardingProgress.DoesNotExist:
        print(f"\n❌ No onboarding progress for {email}")


if __name__ == "__main__":
    # Check specific user first
    print("=== Checking kdeng@dottapps.com ===")
    check_specific_user('kdeng@dottapps.com')
    
    # Run the fix
    fix_incomplete_onboarding()
    
    # Verify the fix
    print("\n=== Verifying kdeng@dottapps.com after fix ===")
    check_specific_user('kdeng@dottapps.com')