#!/usr/bin/env python3
"""
Fix onboarding completion status for users who completed onboarding but still show as incomplete.

This script updates the OnboardingProgress record to mark onboarding as complete
for users who have paid subscriptions but incorrect onboarding status.
"""

import os
import sys
import django
from django.utils import timezone

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession


def fix_user_onboarding(email):
    """Fix onboarding status for a specific user"""
    try:
        user = User.objects.get(email=email)
        print(f"\n🔍 Found user: {user.email} (ID: {user.id})")
        
        # Get OnboardingProgress
        progress = OnboardingProgress.objects.filter(user=user).first()
        if not progress:
            print("❌ No OnboardingProgress record found")
            return False
        
        print(f"\n📋 Current OnboardingProgress status:")
        print(f"   - onboarding_status: {progress.onboarding_status}")
        print(f"   - setup_completed: {progress.setup_completed}")
        print(f"   - current_step: {progress.current_step}")
        print(f"   - completed_steps: {progress.completed_steps}")
        print(f"   - payment_completed: {progress.payment_completed}")
        print(f"   - subscription_plan: {progress.subscription_plan}")
        print(f"   - selected_plan: {progress.selected_plan}")
        
        # Update to complete status
        print(f"\n🔧 Updating OnboardingProgress to complete...")
        
        progress.onboarding_status = 'complete'
        progress.setup_completed = True
        progress.current_step = 'complete'
        progress.next_step = 'dashboard'
        progress.completed_at = timezone.now()
        progress.setup_timestamp = timezone.now()
        
        # Update completed steps
        completed_steps = progress.completed_steps or []
        if 'business_info' not in completed_steps:
            completed_steps.append('business_info')
        if 'subscription' not in completed_steps:
            completed_steps.append('subscription')
        if 'payment' not in completed_steps:
            completed_steps.append('payment')
        if 'setup' not in completed_steps:
            completed_steps.append('setup')
        if 'complete' not in completed_steps:
            completed_steps.append('complete')
        progress.completed_steps = completed_steps
        
        # Mark payment as completed if they have a payment ID
        if progress.payment_id:
            progress.payment_completed = True
            if not progress.payment_timestamp:
                progress.payment_timestamp = timezone.now()
        
        # Save the progress
        progress.save()
        
        print(f"\n✅ OnboardingProgress updated successfully!")
        print(f"   - onboarding_status: {progress.onboarding_status}")
        print(f"   - setup_completed: {progress.setup_completed}")
        print(f"   - completed_steps: {progress.completed_steps}")
        
        # Update active sessions
        active_sessions = UserSession.objects.filter(user=user, is_active=True)
        if active_sessions.exists():
            print(f"\n🔄 Updating {active_sessions.count()} active sessions...")
            active_sessions.update(
                needs_onboarding=False,
                onboarding_completed=True,
                onboarding_step='completed',
                updated_at=timezone.now()
            )
            print("✅ Sessions updated")
        
        return True
        
    except User.DoesNotExist:
        print(f"❌ User not found: {email}")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def fix_all_incomplete_onboarding():
    """Fix all users who have payment but incomplete onboarding"""
    print("\n🔍 Finding users with incomplete onboarding but have payments...")
    
    # Find users with payment_id but incomplete onboarding
    incomplete_users = OnboardingProgress.objects.filter(
        payment_id__isnull=False,  # Has payment
        onboarding_status__in=['business_info', 'subscription', 'payment', 'pending']  # Not complete
    ).select_related('user')
    
    print(f"Found {incomplete_users.count()} users to fix")
    
    fixed_count = 0
    for progress in incomplete_users:
        try:
            print(f"\n👤 Fixing user: {progress.user.email}")
            if fix_user_onboarding(progress.user.email):
                fixed_count += 1
        except Exception as e:
            print(f"❌ Error fixing {progress.user.email}: {e}")
    
    print(f"\n✅ Fixed {fixed_count} out of {incomplete_users.count()} users")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Fix onboarding completion status')
    parser.add_argument('email', nargs='?', help='Email of specific user to fix')
    parser.add_argument('--all', action='store_true', help='Fix all incomplete users with payments')
    
    args = parser.parse_args()
    
    if args.all:
        fix_all_incomplete_onboarding()
    elif args.email:
        fix_user_onboarding(args.email)
    else:
        # Interactive mode
        print("Fix Onboarding Completion Status")
        print("================================")
        print("1. Fix specific user")
        print("2. Fix all users with payments but incomplete onboarding")
        
        choice = input("\nSelect option (1 or 2): ")
        
        if choice == '1':
            email = input("Enter user email: ")
            fix_user_onboarding(email)
        elif choice == '2':
            confirm = input("This will fix all affected users. Continue? (yes/no): ")
            if confirm.lower() == 'yes':
                fix_all_incomplete_onboarding()
            else:
                print("Cancelled")
        else:
            print("Invalid choice")